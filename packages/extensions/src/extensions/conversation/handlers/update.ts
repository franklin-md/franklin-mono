import type { Update } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

export function handleUpdate(_turn: ConversationTurn, _update: Update): void {
	// TODO: Find and replace the corresponding message blocks by messageId.
	// Currently all text arrives via chunks, so this is a no-op. When providers
	// emit updates without chunks (or the final update diverges from streamed
	// deltas), this should reconcile the authoritative update into the turn.
}
