import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationTurnEnd } from './get-turn-end.js';
import { getConversationTurnPhase } from './get-phase.js';
import { getConversationTurnTiming } from './get-timing.js';

export function getConversationRenderTurn(
	turns: readonly ConversationTurn[],
	index: number,
	now: number = Date.now(),
): ConversationRenderTurn | undefined {
	const turn = turns[index];
	if (!turn) return undefined;

	const renderTurn: ConversationRenderTurn = {
		...turn,
		index,
		isLast: index === turns.length - 1,
		phase: getConversationTurnPhase(turn),
		timing: getConversationTurnTiming(turn, now),
	};
	const turnEnd = getConversationTurnEnd(turn);
	if (turnEnd !== undefined) {
		renderTurn.turnEnd = turnEnd;
	}

	return renderTurn;
}
