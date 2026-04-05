// ---------------------------------------------------------------------------
// Pi Adapter — wraps pi-agent-core's Agent as a BaseAgent
//
// Takes a BaseClient (for reverse RPC tool execution) and returns a BaseAgent.
// Tool calls from the pi agent loop are routed through client.toolExecute().
// ---------------------------------------------------------------------------

import { Agent as PiCoreAgent } from '@mariozechner/pi-agent-core';
import type { AgentEvent } from '@mariozechner/pi-agent-core';
import type { StreamFn } from '@mariozechner/pi-agent-core';

import type { TurnClient, TurnServer } from '../types.js';
import type { UserMessage } from '../../types/message.js';
import type { Ctx } from '../../types/context.js';
import type { StreamEvent } from '../../types/stream.js';
import { StopCode } from '../../types/stop-code.js';

import {
	bridgeTool,
	fromAgentEvent,
	toPiMessage,
	toPiUserMessage,
} from './translate/index.js';
import { createMemoryStream } from '@franklin/transport';
import { resolveModel } from './model-resolve.js';

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export interface PiAdapterOptions {
	/** BaseClient for reverse RPC (tool execution) */
	client: TurnServer;
	/** Agent context (history, tools, config) */
	ctx: Ctx;
	/** Custom stream function — inject for testing without real LLM calls */
	streamFn?: StreamFn;
}

export function createPiAdapter(options: PiAdapterOptions): TurnClient {
	const { client, ctx, streamFn } = options;

	let piAgent: PiCoreAgent | null = null;

	return {
		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			// Resolve model lazily at prompt time so unresolvable configs
			// produce a clean turnStart → turnEnd sequence.
			const resolved = resolveModel(ctx.config);
			if (!resolved.ok) {
				yield { type: 'turnStart' };
				yield resolved.turnEnd;
				return;
			}

			// Bridge tool definitions to pi AgentTools that call client.toolExecute
			const handler = client.toolExecute.bind(client);
			const piTools = ctx.tools.map((def) => bridgeTool(def, handler));

			// Convert history messages to pi-ai format
			const piMessages = ctx.history.messages.map(toPiMessage);

			// Create the pi Agent
			piAgent = new PiCoreAgent({
				initialState: {
					systemPrompt: ctx.history.systemPrompt,
					model: resolved.model,
					thinkingLevel: ctx.config?.reasoning ?? 'off',
					tools: piTools,
					messages: piMessages,
				},
				// TODO: Lets not hard code this. I think solution should be to pass this from ctx?
				// Only resolve the API key when using the real stream function (not a test mock).
				getApiKey: streamFn
					? undefined
					: (_: string) => {
							// const key = process.env[`${provider.toUpperCase()}_API_KEY`];
							// if (!key) {
							// 	throw new Error(`Missing API key for provider: ${provider}`);
							// }
							// return key;
							return ctx.config?.apiKey;
						},
				streamFn,
			});
			let currentMessageId = crypto.randomUUID();

			const { readable, writable } = createMemoryStream<StreamEvent>();
			const writer = writable.getWriter();

			// Subscribe to agent events and translate to StreamEvents
			const unsub = piAgent.subscribe((event: AgentEvent) => {
				// Each new LLM message gets a fresh messageId so that
				// chunks and their corresponding update share the same id.
				if (event.type === 'message_start') {
					currentMessageId = crypto.randomUUID();
				}
				// TODO: The assistant message may have a stopReason of 'error' (Pi-level)
				const streamEvent = fromAgentEvent(event, currentMessageId);
				if (streamEvent) {
					void writer.write(streamEvent);
				}
			});

			// Drive the agent loop — this runs until the agent is done
			// (potentially multiple LLM turns with tool calls in between)
			const piMessage = toPiUserMessage(message);
			piAgent
				.prompt(piMessage)
				.then(() => {
					void writer.close();
				})
				.catch(() => {
					// TODO: proper error message formatting on catch(err)
					const msg = 'An error occurred while prompting the agent';
					void writer.write({
						type: 'turnEnd',
						stopCode: StopCode.LlmError,
						stopMessage: msg,
					});
					void writer.close();
				});

			yield* readable;

			unsub();
		},

		async cancel(): Promise<void> {
			if (!piAgent) return;
			piAgent.abort();
			// TODO: Ensure that aborting causes prompt to:
			// a) not hang
			// b) return a turnEnd with cancellation reason
		},
	};
}
