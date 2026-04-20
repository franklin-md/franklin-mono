// ---------------------------------------------------------------------------
// Tracking decorators — composable wrappers that record protocol events
// into shared trackers.
//
// trackAgent  — wraps MuAgent    (toolExecute: tool call + result → CtxTracker)
// trackTurn   — wraps TurnClient (prompt: user message + assistant updates → CtxTracker)
// trackClient — wraps MuClient   (trackTurn + setContext → CtxTracker)
// trackUsage  — wraps TurnClient (turnEnd usage → UsageTracker)
// ---------------------------------------------------------------------------

import type { TurnClient } from '../base/types.js';
import type { MuClient, MuAgent } from './types.js';
import type { CtxTracker } from './ctx-tracker.js';
import type { UsageTracker } from './usage-tracker.js';
import type { StreamEvent } from '../types/stream.js';

/**
 * Decorates a MuAgent to record tool calls and results in the tracker.
 */
export function trackAgent(tracker: CtxTracker, agent: MuAgent): MuAgent {
	return {
		toolExecute: async (params) => {
			tracker.append({ role: 'assistant', content: [params.call] });
			const result = await agent.toolExecute(params);
			tracker.append({
				role: 'toolResult',
				toolCallId: result.toolCallId,
				content: result.content,
			});
			return result;
		},
	};
}

/**
 * Decorates a TurnClient to record user messages and assistant
 * updates in the tracker.
 */
export function trackTurn(tracker: CtxTracker, turn: TurnClient): TurnClient {
	return {
		async *prompt(message): AsyncGenerator<StreamEvent> {
			tracker.append(message);
			for await (const event of turn.prompt(message)) {
				if (event.type === 'update') {
					tracker.append(event.message);
				}
				yield event;
			}
		},
		cancel: turn.cancel.bind(turn),
	};
}

/**
 * Decorates a MuClient to record user messages, assistant updates,
 * and context changes in the tracker. Composes trackTurn for the
 * prompt stream.
 */
export function trackClient(tracker: CtxTracker, client: MuClient): MuClient {
	const tracked = trackTurn(tracker, client);
	return {
		initialize: client.initialize.bind(client),
		cancel: tracked.cancel.bind(tracked),
		prompt: tracked.prompt.bind(tracked),
		async setContext(ctx) {
			tracker.apply(ctx);
			return client.setContext(ctx);
		},
	};
}

/**
 * Decorates a TurnClient to record turn usage into the tracker.
 * No-op for turnEnd events without a `usage` field (pre-LLM errors).
 */
export function trackUsage(
	tracker: UsageTracker,
	turn: TurnClient,
): TurnClient {
	return {
		async *prompt(message): AsyncGenerator<StreamEvent> {
			for await (const event of turn.prompt(message)) {
				if (event.type === 'turnEnd' && event.usage) {
					tracker.add(event.usage);
				}
				yield event;
			}
		},
		cancel: turn.cancel.bind(turn),
	};
}
