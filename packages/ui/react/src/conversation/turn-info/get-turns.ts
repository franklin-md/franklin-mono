import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationRenderTurn } from './get-turn.js';

export function getConversationRenderTurns(
	turns: readonly ConversationTurn[],
	now: number = Date.now(),
): ConversationRenderTurn[] {
	const lastIndex = turns.length - 1;
	return turns.map((turn, index) =>
		getConversationRenderTurn(turn, index, index === lastIndex, now),
	);
}
