import type { ConversationTurn } from '@franklin/extensions';

import type { ConversationTurnTiming } from './types.js';
import { getConversationTurnEnd } from './get-turn-end.js';

const clampMs = (start: number, end: number): number =>
	Math.max(0, end - start);

export function getConversationTurnTiming(
	turn: ConversationTurn,
	now: number,
): ConversationTurnTiming {
	const promptedAt = turn.timestamp;
	const responseStartedAt = turn.response.blocks[0]?.startedAt;
	const turnEnd = getConversationTurnEnd(turn);
	const completedAt = turnEnd && (turnEnd.endedAt ?? turnEnd.startedAt);
	const end = completedAt ?? now;

	return {
		promptedAt,
		elapsedMs: clampMs(promptedAt, end),
		...(responseStartedAt !== undefined && {
			responseStartedAt,
			responseDurationMs: clampMs(responseStartedAt, end),
		}),
		...(completedAt !== undefined && { completedAt }),
	};
}
