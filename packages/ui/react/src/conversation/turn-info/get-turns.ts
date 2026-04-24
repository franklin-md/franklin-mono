import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationRenderTurn } from './get-turn.js';

export function getConversationRenderTurns(
	turns: readonly ConversationTurn[],
	now: number = Date.now(),
): ConversationRenderTurn[] {
	return turns.map((_, index) => {
		const turn = getConversationRenderTurn(turns, index, now);
		if (!turn) {
			throw new Error(`Conversation turn at index ${index} was not found`);
		}
		return turn;
	});
}
