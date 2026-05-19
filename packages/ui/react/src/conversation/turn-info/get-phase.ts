import type { ConversationTurn } from '@franklin/agent';

import type { ConversationTurnPhase } from './types.js';
import { getConversationTurnEnd } from './get-turn-end.js';

export function getConversationTurnPhase(
	turn: ConversationTurn,
): ConversationTurnPhase {
	return getConversationTurnEnd(turn) ? 'complete' : 'in-progress';
}
