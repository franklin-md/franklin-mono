import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationRenderTurn } from './get-turn.js';

export function getLastConversationRenderTurn(
	turns: readonly ConversationTurn[],
	now: number = Date.now(),
): ConversationRenderTurn | undefined {
	const index = turns.length - 1;
	const turn = turns[index];
	if (!turn) return undefined;
	return getConversationRenderTurn(turn, index, true, now);
}
