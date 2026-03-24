// ---------------------------------------------------------------------------
// Session adapter — wraps a TurnClient as a full MiniACPClient with
// session management (initialize, setContext, ctx tracking).
// ---------------------------------------------------------------------------

import type { TurnClient } from '../base/types.js';
import type { Chunk, Update, TurnEnd } from '../types/stream.js';
import type { MuClient, InitializeResult } from './types.js';
import { CtxTracker } from './ctx-tracker.js';
import type { Ctx } from '../types/context.js';

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

	const ack: InitializeResult = {};

	return {
		async initialize() {
			return ack;
		},

		async setContext({ ctx: partial }) {
			// TODO: We should reject a setContext if there is a turn in progress.
			tracker.apply(partial);
			// Invalidate agent so next prompt uses new context
			currentTurn = null;
			return ack;
		},

		async *prompt(params): AsyncGenerator<Chunk | Update | TurnEnd> {
			// TODO: We should reject a prompt if there is a turn in progress.
			currentTurn = getAgent(tracker.get());

			tracker.append(params.message);
			for await (const event of currentTurn.prompt(params)) {
				if (event.type === 'update') {
					tracker.append(event.message);
				}

				yield event;
			}

			currentTurn = null;
		},

		async cancel(params) {
			if (!currentTurn) {
				// TODO: Raise error or silently drop
				return;
			}
			return currentTurn.cancel(params);
		},
	};
}
