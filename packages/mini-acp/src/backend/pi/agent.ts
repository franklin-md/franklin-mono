import { createMemoryStream } from '@franklin/lib/transport';
import { Agent as PiCoreAgent } from '@earendil-works/pi-agent-core';
import type {
	AgentEvent,
	AgentLoopTurnUpdate,
	StreamFn,
} from '@earendil-works/pi-agent-core';
import type { Model } from '@earendil-works/pi-ai';

import { ContextTracker } from '../../protocol/context-tracker.js';
import { trackAgent } from '../../protocol/tracking.js';
import type { MuAgent, MuClient } from '../../protocol/types.js';
import type { Context, ContextPatch } from '../../types/context.js';
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
	streamFn?: StreamFn;
};

export function createPiAgent(
	server: MuAgent,
	options: CreatePiAgentOptions = {},
): MuClient {
	return new PiMuAgent(server, options);
}

class PiMuAgent implements MuClient {
	private readonly context = new ContextTracker();
	private readonly trackedServer: MuAgent;
	private readonly streamFn?: StreamFn;

	private activeAgent: PiCoreAgent | null = null;
	private activePrompt = false;
	private pendingTurnPatch: ContextPatch | undefined;

	constructor(server: MuAgent, options: CreatePiAgentOptions) {
		this.trackedServer = trackAgent(this.context, server);
		this.streamFn = options.streamFn;
	}

	async initialize(): Promise<void> {}

	async setContext(patch: ContextPatch): Promise<void> {
		if (!this.activePrompt) {
			this.context.apply(patch);
			return;
		}

		if (patch.tools !== undefined) {
			this.context.apply({ tools: patch.tools });
		}

		const deferred = activeTurnDeferredPatch(patch);
		if (deferred) {
			this.pendingTurnPatch = mergeContextPatch(
				this.pendingTurnPatch,
				deferred,
			);
		}
	}

	async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
		if (this.activePrompt) {
			throw new Error('Mini-ACP prompt already in progress');
		}

		this.activePrompt = true;
		const initialContext = this.context.get();
		this.context.append(message);

		try {
			for await (const event of this.promptWithContext(
				initialContext,
				message,
			)) {
				if (event.type === 'update') {
					this.context.append(event.message);
				}
				yield event;
			}
		} finally {
			this.finishPrompt();
		}
	}

	async cancel(): Promise<void> {
		this.activeAgent?.abort();
	}

	private async *promptWithContext(
		context: Context,
		message: UserMessage,
	): AsyncGenerator<StreamEvent> {
		const resolved = resolveConfig(context.config);
		if (!resolved.ok) {
			yield { type: 'turnStart' };
			yield resolved.turnEnd;
			return;
		}

		const agent = this.createAgent(context, resolved.model);
		this.activeAgent = agent;
		yield* this.streamAgentPrompt(agent, message);
	}

	private createAgent(context: Context, model: Model<string>): PiCoreAgent {
		const agentRef: { current?: PiCoreAgent } = {};
		const agent = new PiCoreAgent({
			initialState: {
				systemPrompt: context.systemPrompt,
				model,
				thinkingLevel: context.config.reasoning ?? 'off',
				tools: this.createPiTools(context.tools),
				messages: context.messages.map(toPiMessage),
			},
			getApiKey: (_: string) => {
				return context.config.apiKey;
			},
			prepareNextTurn: () => this.prepareNextTurn(agentRef.current),
			streamFn: this.streamFn,
		});
		agentRef.current = agent;
		return agent;
	}

	private prepareNextTurn(
		current: PiCoreAgent | undefined,
	): AgentLoopTurnUpdate | undefined {
		if (!current) return undefined;
		return {
			context: {
				systemPrompt: current.state.systemPrompt,
				messages: [...current.state.messages],
				tools: this.createPiTools(this.context.get().tools),
			},
		};
	}

	private async *streamAgentPrompt(
		agent: PiCoreAgent,
		message: UserMessage,
	): AsyncGenerator<StreamEvent> {
		let currentMessageId = crypto.randomUUID();
		const { readable, writable } = createMemoryStream<StreamEvent>();
		const writer = writable.getWriter();

		const unsub = agent.subscribe((event: AgentEvent) => {
			if (event.type === 'message_start') {
				currentMessageId = crypto.randomUUID();
			}
			const streamEvent = fromAgentEvent(event, currentMessageId);
			if (streamEvent) {
				void writer.write(streamEvent);
			}
		});

		const piMessage = toPiUserMessage(message);
		agent
			.prompt(piMessage)
			.then(() => {
				void writer.close();
			})
			.catch(() => {
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
		const handler = this.trackedServer.toolExecute.bind(this.trackedServer);
		return tools.map((def) => bridgeTool(def, handler));
	}

	private finishPrompt(): void {
		this.activeAgent = null;
		this.activePrompt = false;
		if (!this.pendingTurnPatch) return;

		const patch = this.pendingTurnPatch;
		this.pendingTurnPatch = undefined;
		this.context.apply(patch);
	}
}

function activeTurnDeferredPatch(
	patch: ContextPatch,
): ContextPatch | undefined {
	const deferred: ContextPatch = {};
	if (patch.systemPrompt !== undefined) {
		deferred.systemPrompt = patch.systemPrompt;
	}
	if (patch.messages !== undefined) {
		deferred.messages = patch.messages;
	}
	if (patch.config !== undefined) {
		deferred.config = patch.config;
	}
	return hasContextPatch(deferred) ? deferred : undefined;
}

function mergeContextPatch(
	current: ContextPatch | undefined,
	next: ContextPatch,
): ContextPatch {
	const merged: ContextPatch = { ...(current ?? {}) };
	if (next.systemPrompt !== undefined) {
		merged.systemPrompt = next.systemPrompt;
	}
	if (next.messages !== undefined) {
		merged.messages = next.messages;
	}
	if (next.tools !== undefined) {
		merged.tools = next.tools;
	}
	if (next.config !== undefined) {
		merged.config = { ...(merged.config ?? {}), ...next.config };
	}
	return merged;
}

function hasContextPatch(patch: ContextPatch): boolean {
	return (
		patch.systemPrompt !== undefined ||
		patch.messages !== undefined ||
		patch.tools !== undefined ||
		patch.config !== undefined
	);
}
