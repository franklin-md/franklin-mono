// ---------------------------------------------------------------------------
// Tracking decorators — composable wrappers that record protocol events
// into shared trackers.
//
// trackAgent   — wraps MuAgent    (toolExecute: tool call + result → ContextRecorder)
// trackTurn    — wraps prompt/cancel behavior (prompt + updates → ContextRecorder)
// trackClient  — wraps MuClient   (trackTurn + setContext → ContextRecorder)
// trackUsage   — wraps prompt/cancel behavior (turnEnd usage → UsageTracker)
// decorateTurn — lift a prompt/cancel transform to a MuClient transform
// ---------------------------------------------------------------------------

import type { MuClient, MuAgent } from './types.js';
import type { ContextRecorder } from './context-tracker.js';
import type { UsageTracker } from './usage-tracker.js';
import type { StreamEvent } from '../types/stream.js';

/**
 * Lift a prompt/cancel transform to a MuClient transform.
 *
 * `initialize` and `setContext` pass through to the original client;
 * `prompt` and `cancel` come from the transformed turn. Useful when a
 * decoration only concerns the prompt stream (e.g. usage tracking).
 */
export function decorateTurn(
	client: MuClient,
	transform: (
		turn: Pick<MuClient, 'prompt' | 'cancel'>,
	) => Pick<MuClient, 'prompt' | 'cancel'>,
): MuClient {
	const tracked = transform(client);
	return {
		initialize: client.initialize.bind(client),
		setContext: client.setContext.bind(client),
		prompt: tracked.prompt.bind(tracked),
		cancel: tracked.cancel.bind(tracked),
	};
}

/**
 * Decorates a MuAgent to record tool calls and results in the tracker.
 */
export function trackAgent(tracker: ContextRecorder, agent: MuAgent): MuAgent {
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
 * Decorates prompt/cancel behavior to record user messages and assistant
 * updates in the tracker.
 */
export function trackTurn(
	tracker: ContextRecorder,
	turn: Pick<MuClient, 'prompt' | 'cancel'>,
): Pick<MuClient, 'prompt' | 'cancel'> {
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
export function trackClient(
	tracker: ContextRecorder,
	client: MuClient,
): MuClient {
	const decorated = decorateTurn(client, (turn) => trackTurn(tracker, turn));
	return {
		...decorated,
		async setContext(context) {
			await client.setContext(context);
			tracker.apply(context);
		},
	};
}

/**
 * Decorates prompt/cancel behavior to record turn usage into the tracker.
 * No-op for turnEnd events without a `usage` field (pre-LLM errors).
 */
export function trackUsage(
	tracker: UsageTracker,
	turn: Pick<MuClient, 'prompt' | 'cancel'>,
): Pick<MuClient, 'prompt' | 'cancel'> {
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
