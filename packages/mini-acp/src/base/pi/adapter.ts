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

import type {
	TurnClient,
	TurnAgent,
	PromptParams,
	CancelParams,
} from '../types.js';
import type { Ctx } from '../../types/context.js';
import type {
	Chunk,
	StreamEvent,
	TurnEnd,
	Update,
} from '../../types/stream.js';
import {
	bridgeTool,
	fromAgentEvent,
	toPiMessage,
	toPiUserMessage,
} from './translate/index.js';
import { createMemoryStream } from '@franklin/transport';

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export interface PiAdapterOptions {
	/** BaseClient for reverse RPC (tool execution) */
	client: TurnAgent;
	/** Pre-resolved pi-ai Model */
	model: Model<string>;
	/** Agent context (history, tools, config) */
	ctx: Ctx;
	/** Custom stream function — inject for testing without real LLM calls */
	streamFn?: StreamFn;
}

export function createPiAdapter(options: PiAdapterOptions): TurnClient {
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
		async *prompt(
			params: PromptParams,
		): AsyncGenerator<Chunk | Update | TurnEnd> {
			const messageId = crypto.randomUUID();

			const { readable, writable } = createMemoryStream<StreamEvent>();
			const writer = writable.getWriter();

			// Subscribe to agent events and translate to StreamEvents
			const unsub = piAgent.subscribe((event: AgentEvent) => {
				// TODO: The assistant message may have a stopReason of 'error'
				const streamEvent = fromAgentEvent(event, messageId);
				if (streamEvent) {
					void writer.write(streamEvent);
				}
			});

			// Drive the agent loop — this runs until the agent is done
			// (potentially multiple LLM turns with tool calls in between)
			const piMessage = toPiUserMessage(params.message);
			piAgent
				.prompt(piMessage)
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

			for await (const event of readable) {
				if (
					event.type === 'chunk' ||
					event.type === 'update' ||
					event.type === 'turnEnd'
				) {
					yield event;
				}
			}

			unsub();
		},

		async cancel(_params: CancelParams): Promise<TurnEnd> {
			piAgent.abort();
			return {
				type: 'turnEnd',
				error: { code: -1, message: 'Cancelled' },
			};
		},
	};
}
