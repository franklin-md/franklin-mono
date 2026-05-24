// ---------------------------------------------------------------------------
// Session adapter — wraps prompt/cancel implementation as a full MiniACPClient with
// session management (initialize, setContext, context tracking).
// ---------------------------------------------------------------------------

import type { StreamEvent } from '../types/stream.js';
import type { MuAgent, MuClient } from './types.js';
import { ContextTracker } from './context-tracker.js';
import type { Context, ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import { trackAgent, trackTurn } from './tracking.js';

/**
 * Wraps a lazily-created prompt/cancel implementation as a full MiniACPClient.
 *
 * The adapter manages context tracking and agent lifecycle:
 * - `initialize()` acknowledges session start
 * - `setContext()` applies partial context to the tracker and invalidates the agent
 * - `prompt()` lazily creates the turn client, tracks user + response messages
 * - `cancel()` forwards to the current turn client (if any)
 *
 */
export function createSessionAdapter(
	createPromptClient: (
		context: Context,
		server: MuAgent,
	) => Pick<MuClient, 'prompt' | 'cancel'>,
	server: MuAgent,
): MuClient {
	const tracker = new ContextTracker();
	let currentTurn: Pick<MuClient, 'prompt' | 'cancel'> | null = null;
	const trackedServer = trackAgent(tracker, server);

	return {
		async initialize() {},

		async setContext(context: ContextPatch) {
			tracker.apply(context);
			currentTurn = null;
		},

		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			// TODO: We should reject a prompt if there is a turn in progress.
			// TODO: Turn this into a testable spec point.
			currentTurn = trackTurn(
				tracker,
				createPromptClient(tracker.get(), trackedServer),
			);
			yield* currentTurn.prompt(message);
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
