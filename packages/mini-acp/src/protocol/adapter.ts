// ---------------------------------------------------------------------------
// Session adapter — wraps a TurnClient as a full MiniACPClient with
// session management (initialize, setContext, ctx tracking).
// ---------------------------------------------------------------------------

import type { TurnClient } from '../base/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { MuClient } from './types.js';
import { CtxTracker } from './ctx-tracker.js';
import type { Ctx } from '../types/context.js';
import type { UserMessage } from '../types/message.js';

/**
 * Wraps a lazily-created TurnClient as a full MiniACPClient.
 *
 * The adapter manages context tracking and agent lifecycle:
 * - `initialize()` acknowledges session start
 * - `setContext()` applies partial ctx to the tracker and invalidates the agent
 * - `prompt()` lazily creates the agent, tracks user + response messages
 * - `cancel()` forwards to the current agent (if any)
 *
 */
export function createSessionAdapter(
	getAgent: (ctx: Ctx) => TurnClient,
): MuClient {
	const tracker = new CtxTracker();
	let currentTurn: TurnClient | null = null;

	return {
		async initialize() {},

		async setContext(ctx: Partial<Ctx>) {
			// TODO: We should reject a setContext if there is a turn in progress.
			tracker.apply(ctx);
			// Invalidate agent so next prompt uses new context
			currentTurn = null;
		},

		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			// TODO: We should reject a prompt if there is a turn in progress.
			// TODO: Turn this into a testable spec point.
			currentTurn = getAgent(tracker.get());

			tracker.append(message);
			for await (const event of currentTurn.prompt(message)) {
				if (event.type === 'update') {
					tracker.append(event.message);
				}

				yield event;
			}

			currentTurn = null;
		},

		async cancel() {
			if (!currentTurn) {
				// TODO: Raise error or silently drop
				return;
			}
			return currentTurn.cancel();
		},
	};
}
