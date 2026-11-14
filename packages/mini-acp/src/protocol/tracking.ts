// ---------------------------------------------------------------------------
// Tracking decorators — composable wrappers that record protocol events
// into shared trackers.
//
// trackAgent   — wraps MuAgent    (toolExecute: tool call + result → ContextRecorder)
// trackTurn    — wraps prompt/continue/cancel behavior (prompt + updates → ContextRecorder)
// trackClient  — wraps MuClient   (trackTurn + setContext → ContextRecorder)
// trackUsage   — wraps prompt/continue/cancel behavior (stepUsage deltas → UsageTracker)
// decorateTurn — lift a prompt/continue/cancel transform to a MuClient transform
// ---------------------------------------------------------------------------

import type { MuClient, MuAgent, MuTurn } from './types.js';
import type { ContextRecorder } from './context-tracker.js';
import type { UsageTracker } from './usage-tracker.js';
import type { StreamEvent } from '../types/stream.js';

/**
 * Lift a prompt/continue/cancel transform to a MuClient transform.
 *
 * `initialize` and `setContext` pass through to the original client;
 * `prompt`, `continue` and `cancel` come from the transformed turn. Useful when a
 * decoration only concerns the prompt stream (e.g. usage tracking).
 */
export function decorateTurn(
	client: MuClient,
	transform: (turn: MuTurn) => MuTurn,
): MuClient {
	const tracked = transform(client);
	return {
		initialize: client.initialize.bind(client),
		setContext: client.setContext.bind(client),
		prompt: tracked.prompt.bind(tracked),
		continue: tracked.continue.bind(tracked),
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
 * Decorates prompt/continue/cancel behavior to record user messages and assistant
 * updates in the tracker.
 */
export function trackTurn(tracker: ContextRecorder, turn: MuTurn): MuTurn {
	async function* record(
		stream: AsyncIterable<StreamEvent>,
	): AsyncGenerator<StreamEvent> {
		for await (const event of stream) {
			if (event.type === 'update') tracker.append(event.message);
			yield event;
		}
	}
	return {
		async *prompt(message) {
			tracker.append(message);
			yield* record(turn.prompt(message));
		},
		continue: () => record(turn.continue()),
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
 * Decorates prompt/continue/cancel behavior to record per-step usage into the tracker.
 * Legacy unstepped turns may supply only cumulative `usage` at turnEnd.
 */
export function trackUsage(tracker: UsageTracker, turn: MuTurn): MuTurn {
	async function* record(
		stream: AsyncIterable<StreamEvent>,
	): AsyncGenerator<StreamEvent> {
		for await (const event of stream) {
			if (event.type === 'stepEnd' || event.type === 'turnEnd') {
				const usage =
					event.stepUsage ??
					(event.type === 'turnEnd' ? event.usage : undefined);
				if (usage) tracker.add(usage);
			}
			yield event;
		}
	}
	return {
		prompt: (message) => record(turn.prompt(message)),
		continue: () => record(turn.continue()),
		cancel: turn.cancel.bind(turn),
	};
}
