import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationRenderTurn } from './get-turn.js';

export function getLastConversationRenderTurn(
	turns: readonly ConversationTurn[],
	now: number = Date.now(),
): ConversationRenderTurn | undefined {
	return getConversationRenderTurn(turns, turns.length - 1, now);
}
