// ---------------------------------------------------------------------------
// Pi Adapter — wraps pi-agent-core's Agent as a BaseAgent
//
// Takes a BaseClient (for reverse RPC tool execution) and returns a BaseAgent.
// Tool calls from the pi agent loop are routed through client.toolExecute().
// ---------------------------------------------------------------------------

import { Agent as PiCoreAgent } from '@mariozechner/pi-agent-core';
import type { AgentEvent } from '@mariozechner/pi-agent-core';
import type { Model } from '@mariozechner/pi-ai';
import type { StreamFn } from '@mariozechner/pi-agent-core';

import type { BaseAgent, BaseClient } from './types.js';
import type { Ctx } from '../types/context.js';
import type { StreamEvent } from '../types/stream.js';
import type { UserMessage } from '../types/message.js';
import {
	bridgeTool,
	fromAgentEvent,
	toPiMessage,
	toPiUserMessage,
} from './translate/index.js';

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export interface PiAdapterOptions {
	/** BaseClient for reverse RPC (tool execution) */
	client: BaseClient;
	/** Pre-resolved pi-ai Model */
	model: Model<string>;
	/** Agent context (history, tools, config) */
	ctx: Ctx;
	/** Custom stream function — inject for testing without real LLM calls */
	streamFn?: StreamFn;
}

export function createPiAdapter(options: PiAdapterOptions): BaseAgent {
	const { client, model, ctx, streamFn } = options;

	// Bridge tool definitions to pi AgentTools that call client.toolExecute
	const handler = client.toolExecute.bind(client);
	const piTools = ctx.tools.map((def) => bridgeTool(def, handler));

	// Convert history messages to pi-ai format
	const piMessages = ctx.history.messages.map(toPiMessage);

	// Create the pi Agent
	const piAgent = new PiCoreAgent({
		initialState: {
			systemPrompt: ctx.history.systemPrompt,
			model,
			thinkingLevel: ctx.config?.reasoning ?? 'off',
			tools: piTools,
			messages: piMessages,
		},
		streamFn,
	});

	return {
		async *prompt(params: {
			message: UserMessage;
		}): AsyncIterable<StreamEvent> {
			const messageId = crypto.randomUUID();

			// TransformStream bridges synchronous event pushes to async iteration.
			// Writable HWM of 16 gives a small buffer for bursts from the agent
			// loop. Writes from the subscribe callback are fire-and-forget (not
			// awaited) — if the consumer falls behind, backpressure will cause
			// write() promises to pend until the readable side drains.
			const { readable, writable } = new TransformStream<StreamEvent>(
				undefined,
				{ highWaterMark: 16 },
			);
			const writer = writable.getWriter();

			// Emit turnStart immediately
			void writer.write({ type: 'turnStart' });

			// Subscribe to agent events and translate to StreamEvents
			const unsub = piAgent.subscribe((event: AgentEvent) => {
				const streamEvent = fromAgentEvent(event, messageId);
				if (streamEvent) {
					void writer.write(streamEvent);
				}
			});

			// Drive the agent loop — this runs until the agent is done
			// (potentially multiple LLM turns with tool calls in between)
			piAgent
				.prompt(toPiUserMessage(params.message))
				.then(() => {
					void writer.write({ type: 'turnEnd' });
					void writer.close();
				})
				.catch((err: unknown) => {
					void writer.write({
						type: 'turnEnd',
						error: {
							code: -1,
							message: err instanceof Error ? err.message : String(err),
						},
					});
					void writer.close();
				});

			yield* readable;

			unsub();
		},

		async cancel(): Promise<StreamEvent> {
			piAgent.abort();
			return {
				type: 'turnEnd',
				error: { code: -1, message: 'Cancelled' },
			};
		},
	};
}
