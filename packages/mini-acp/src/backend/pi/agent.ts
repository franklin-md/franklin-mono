import { createMemoryStream } from '@franklin/lib/transport';
import { Agent as PiCoreAgent } from '@earendil-works/pi-agent-core';
import type {
	AgentEvent,
	AgentLoopTurnUpdate,
	StreamFn,
} from '@earendil-works/pi-agent-core';

import type { MuAgent, MuClient } from '../../protocol/types.js';
import type { ContextPatch, LLMConfig } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import { StopCode } from '../../types/stop-code.js';
import type { StreamEvent } from '../../types/stream.js';
import type { ToolDefinition } from '../../types/tool.js';
import { resolveConfig } from './resolve-config.js';
import {
	bridgeTool,
	fromAgentEvent,
	toPiMessage,
	toPiUserMessage,
} from './translate/index.js';

export type CreatePiAgentOptions = {
	/** Custom stream function, injected by tests to avoid real provider calls. */
	streamFn?: StreamFn;
};

export function createPiAgent(
	server: MuAgent,
	options: CreatePiAgentOptions = {},
): MuClient {
	return new PiMuAgent(server, options);
}

class PiMuAgent implements MuClient {
	private readonly server: MuAgent;
	private readonly agent: PiCoreAgent;

	private config: LLMConfig = {};
	private activePrompt = false;

	constructor(server: MuAgent, options: CreatePiAgentOptions) {
		this.server = server;
		this.agent = this.createAgent(options.streamFn);
	}

	async initialize(): Promise<void> {}

	async setContext(patch: ContextPatch): Promise<void> {
		if (this.activePrompt) {
			// Pi can refresh tools between internal LLM turns, but prompt/history
			// changes mid-run would fork the active transcript.
			this.applyActiveContext(patch);
			return;
		}

		this.applyIdleContext(patch);
	}

	async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
		if (this.activePrompt) {
			throw new Error('Mini-ACP prompt already in progress');
		}

		this.activePrompt = true;

		try {
			// Resolve lazily at prompt time so bad config still emits a clean
			// turnStart -> turnEnd stream instead of throwing from setContext.
			const resolved = resolveConfig(this.config);
			if (!resolved.ok) {
				yield { type: 'turnStart' };
				yield resolved.turnEnd;
				return;
			}

			this.agent.state.model = resolved.model;
			this.agent.state.thinkingLevel = this.config.reasoning ?? 'off';

			yield* this.streamAgentPrompt(message);
		} finally {
			this.activePrompt = false;
		}
	}

	async cancel(): Promise<void> {
		// pi-agent-core is responsible for settling the active prompt and emitting
		// an aborted stop reason after abort().
		this.agent.abort();
	}

	private createAgent(streamFn: StreamFn | undefined): PiCoreAgent {
		return new PiCoreAgent({
			initialState: {},
			getApiKey: (_: string) => {
				return this.config.apiKey;
			},
			prepareNextTurn: () => this.prepareNextTurn(),
			streamFn,
		});
	}

	private prepareNextTurn(): AgentLoopTurnUpdate {
		return {
			context: {
				systemPrompt: this.agent.state.systemPrompt,
				messages: [...this.agent.state.messages],
				tools: [...this.agent.state.tools],
			},
		};
	}

	private async *streamAgentPrompt(
		message: UserMessage,
	): AsyncGenerator<StreamEvent> {
		let currentMessageId = crypto.randomUUID();
		const { readable, writable } = createMemoryStream<StreamEvent>();
		const writer = writable.getWriter();

		const unsub = this.agent.subscribe((event: AgentEvent) => {
			// Each new LLM message gets a fresh messageId so chunks and their
			// corresponding update share a stable Mini-ACP id.
			if (event.type === 'message_start') {
				currentMessageId = crypto.randomUUID();
			}
			const streamEvent = fromAgentEvent(event, currentMessageId);
			if (streamEvent) {
				void writer.write(streamEvent);
			}
		});

		const piMessage = toPiUserMessage(message);
		// Drive the Pi loop until it settles, including any tool-call follow-ups.
		this.agent
			.prompt(piMessage)
			.then(() => {
				void writer.close();
			})
			.catch(() => {
				// Keep the Mini-ACP stream well-formed if Pi rejects outside its
				// normal error event path.
				void writer.write({
					type: 'turnEnd',
					stopCode: StopCode.LlmError,
					stopMessage: 'An error occurred while prompting the agent',
				});
				void writer.close();
			});

		try {
			yield* readable;
		} finally {
			unsub();
		}
	}

	private createPiTools(tools: ToolDefinition[]) {
		const handler = this.server.toolExecute.bind(this.server);
		return tools.map((def) => bridgeTool(def, handler));
	}

	private applyIdleContext(patch: ContextPatch): void {
		if (patch.systemPrompt !== undefined) {
			this.agent.state.systemPrompt = patch.systemPrompt;
		}
		if (patch.messages !== undefined) {
			this.agent.state.messages = patch.messages.map(toPiMessage);
		}
		if (patch.tools !== undefined) {
			this.agent.state.tools = this.createPiTools(patch.tools);
		}
		if (patch.config !== undefined) {
			this.config = { ...this.config, ...patch.config };
		}
	}

	private applyActiveContext(patch: ContextPatch): void {
		if (!isToolsOnlyPatch(patch)) {
			throw new Error(
				'Pi setContext during an active prompt only accepts tools',
			);
		}
		if (patch.tools !== undefined) {
			this.agent.state.tools = this.createPiTools(patch.tools);
		}
	}
}

function isToolsOnlyPatch(patch: ContextPatch): boolean {
	return (
		patch.systemPrompt === undefined &&
		patch.messages === undefined &&
		patch.config === undefined
	);
}
