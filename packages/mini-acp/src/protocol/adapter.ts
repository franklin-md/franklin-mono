// ---------------------------------------------------------------------------
// Session adapter — wraps a TurnClient as a full MiniACPClient with
// session management (initialize, setContext, ctx tracking).
// ---------------------------------------------------------------------------

import type { TurnClient, TurnServer } from '../base/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { MuClient } from './types.js';
import { CtxTracker } from './ctx-tracker.js';
import type { Ctx } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import { trackAgent, trackTurn } from './tracking.js';

/**
 * Wraps a lazily-created TurnClient as a full MiniACPClient.
 *
 * The adapter manages context tracking and agent lifecycle:
 * - `initialize()` acknowledges session start
 * - `setContext()` applies partial ctx to the tracker and invalidates the agent
 * - `prompt()` lazily creates the turn client, tracks user + response messages
 * - `cancel()` forwards to the current turn client (if any)
 *
 */
export function createSessionAdapter(
	createTurnClient: (ctx: Ctx, server: TurnServer) => TurnClient,
	server: TurnServer,
): MuClient {
	const tracker = new CtxTracker();
	let currentTurn: TurnClient | null = null;
	const trackedServer = trackAgent(tracker, server);

	return {
		async initialize() {},

		async setContext(ctx: Partial<Ctx>) {
			// TODO FRA-76: We should reject a setContext if there is a turn in progress.
			tracker.apply(ctx);
			// Invalidate agent so next prompt uses new context
			currentTurn = null;
		},

		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			if (currentTurn) {
				throw new Error('Cannot prompt while a turn is already in progress');
			}

			const turn = trackTurn(
				tracker,
				createTurnClient(tracker.get(), trackedServer),
			);
			currentTurn = turn;

			try {
				yield* turn.prompt(message);
			} finally {
				if (currentTurn === turn) {
					currentTurn = null;
				}
			}
		},

		async cancel() {
			if (!currentTurn) {
				// TODO FRA-157: Raise error or silently drop
				return;
			}
			return currentTurn.cancel();
		},
	};
}
