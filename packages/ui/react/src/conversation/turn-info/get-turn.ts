import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationRenderTurn } from './types.js';
import { getConversationTurnEnd } from './get-turn-end.js';
import { getConversationTurnTiming } from './get-timing.js';

export function getConversationRenderTurn(
	turn: ConversationTurn,
	index: number,
	isLast: boolean,
	now: number = Date.now(),
): ConversationRenderTurn {
	const turnEnd = getConversationTurnEnd(turn);
	return {
		...turn,
		index,
		isLast,
		phase: turnEnd ? 'complete' : 'in-progress',
		turnEnd,
		timing: getConversationTurnTiming(turn, now),
	};
}
