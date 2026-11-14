import { createMemoryStream } from '@franklin/lib/transport';
import {
	runAgentLoop,
	runAgentLoopContinue,
} from '@earendil-works/pi-agent-core';
import type {
	AgentContext,
	AgentEvent,
	AgentLoopConfig,
	StreamFn,
} from '@earendil-works/pi-agent-core';
import type { AssistantMessage } from '@earendil-works/pi-ai';

import type { MuAgent, MuClient } from '../../protocol/types.js';
import { UsageTracker, ZERO_USAGE } from '../../protocol/usage-tracker.js';
import type { ContextPatch, LLMConfig } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import type { StepEnd, StreamEvent, TurnEnd } from '../../types/stream.js';
import { resolveConfig } from './resolve-config.js';
import {
	bridgeTool,
	fromAgentEvent,
	toPiUserMessage,
} from './translate/index.js';
import { toPiMessages } from './translate/message.js';
import { fromPiUsage } from './translate/usage.js';
import { stepTerminal } from './terminal.js';

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
	private readonly context: AgentContext = {
		systemPrompt: '',
		messages: [],
		tools: [],
	};
	private config: LLMConfig = {};
	private activeRun: AbortController | undefined;
	private pending = false;
	private cancelled = false;
	private usage = new UsageTracker();

	constructor(
		private readonly server: MuAgent,
		private readonly options: CreatePiAgentOptions,
	) {}

	async initialize(): Promise<void> {}

	async setContext(patch: ContextPatch): Promise<void> {
		if (
			this.activeRun &&
			(patch.systemPrompt !== undefined ||
				patch.messages !== undefined ||
				patch.config !== undefined)
		) {
			throw new Error(
				'Pi setContext during an active drive only accepts tools',
			);
		}
		if (patch.systemPrompt !== undefined) {
			this.context.systemPrompt = patch.systemPrompt;
		}
		if (patch.messages !== undefined) {
			this.context.messages = toPiMessages(patch.messages);
		}
		if (patch.tools !== undefined) {
			const handler = this.server.toolExecute.bind(this.server);
			this.context.tools = patch.tools.map((def) => bridgeTool(def, handler));
		}
		if (patch.config !== undefined) {
			this.config = { ...this.config, ...patch.config };
		}
	}

	prompt(message: UserMessage): AsyncIterable<StreamEvent> {
		return this.drive(message);
	}

	continue(): AsyncIterable<StreamEvent> {
		return this.drive();
	}

	async cancel(): Promise<void> {
		if (!this.pending) return;
		this.cancelled = true;
		this.activeRun?.abort();
	}

	private async *drive(message?: UserMessage): AsyncGenerator<StreamEvent> {
		if (this.activeRun) throw new Error('Mini-ACP drive already in progress');
		if (message && this.pending) {
			throw new Error(
				'Mini-ACP turn paused; continue or cancel it before prompt',
			);
		}
		if (!message && !this.pending) return;
		if (message) {
			this.pending = true;
			this.cancelled = false;
			this.usage = new UsageTracker();
		}

		const run = new AbortController();
		this.activeRun = run;
		const lifecycle = { settled: false };
		let currentMessageId = crypto.randomUUID();
		let response: AssistantMessage | undefined;
		const { readable, writable } = createMemoryStream<StreamEvent>();
		const writer = writable.getWriter();
		const write = (event: StreamEvent) => writer.write(event).catch(() => {});

		const emit = async (event: AgentEvent) => {
			// Each new LLM message gets a fresh messageId so chunks and their
			// corresponding update share a stable Mini-ACP id.
			if (event.type === 'message_start')
				currentMessageId = crypto.randomUUID();
			if (event.type === 'message_end') {
				this.context.messages.push(event.message);
				if (event.message.role === 'assistant') response = event.message;
			}
			const translated = fromAgentEvent(event, currentMessageId);
			if (translated && translated.type !== 'turnStart')
				await write(translated);
		};

		const execute = async (): Promise<StepEnd | TurnEnd> => {
			if (message) await write({ type: 'turnStart' });
			if (this.cancelled) {
				return stepTerminal(
					undefined,
					ZERO_USAGE,
					this.usage.get(),
					true,
					undefined,
				);
			}

			// Resolve lazily so bad config still ends the drive cleanly rather than
			// throwing from setContext. Previous steps' usage survives such failures.
			const resolved = resolveConfig(this.config);
			if (!resolved.ok) {
				return {
					...resolved.turnEnd,
					stepUsage: ZERO_USAGE,
					usage: this.usage.get(),
				};
			}
			const config: AgentLoopConfig = {
				model: resolved.model,
				reasoning:
					this.config.reasoning === 'off' ? undefined : this.config.reasoning,
				apiKey: this.config.apiKey,
				convertToLlm: (messages) =>
					messages.filter(
						(m) =>
							m.role === 'user' ||
							m.role === 'assistant' ||
							m.role === 'toolResult',
					),
				// Pi 0.75.4's public Agent does not forward this option. Use the public
				// runners: Pi still owns streaming, validation and the complete tool batch.
				// https://github.com/earendil-works/pi-mono/blob/v0.75.4/packages/agent/src/agent-loop.ts
				shouldStopAfterTurn: () => true,
			};
			// Isolate Pi's mutable transcript from our event-recorded context. Tool
			// refreshes during a drive take effect on the following explicit drive.
			const context = { ...this.context, messages: [...this.context.messages] };
			let failure: unknown;
			try {
				if (message) {
					await runAgentLoop(
						[toPiUserMessage(message)],
						context,
						config,
						emit,
						run.signal,
						this.options.streamFn,
					);
				} else {
					await runAgentLoopContinue(
						context,
						config,
						emit,
						run.signal,
						this.options.streamFn,
					);
				}
			} catch (error) {
				// Unexpected runner failures are real errors, never a stepping mechanism.
				failure = error;
			}
			const stepUsage = response ? fromPiUsage(response.usage) : ZERO_USAGE;
			this.usage.add(stepUsage);
			return stepTerminal(
				response,
				stepUsage,
				this.usage.get(),
				run.signal.aborted,
				failure,
			);
		};

		void execute().then(async (terminal) => {
			this.pending = terminal.type === 'stepEnd';
			// Pi's agent_end precedes settlement. Publish the idle guarantee only
			// after the runner has returned and adapter state is ready for reentry.
			this.activeRun = undefined;
			lifecycle.settled = true;
			await write(terminal);
			await writer.close().catch(() => {});
		});

		try {
			yield* readable;
		} finally {
			// Never abort a later drive started by a consumer at this terminal.
			if (!lifecycle.settled) run.abort();
		}
	}
}
