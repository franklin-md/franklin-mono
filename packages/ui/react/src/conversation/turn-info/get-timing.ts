import type { ConversationTurn, TurnEndBlock } from '@franklin/extensions';

import type { ConversationTurnTiming } from './types.js';
import { getConversationTurnEnd } from './get-turn-end.js';

function getPromptedAt(turn: ConversationTurn): number {
	return turn.timestamp;
}

function getResponseStartedAt(turn: ConversationTurn): number | undefined {
	return turn.response.blocks[0]?.startedAt;
}

function getCompletedAt(turnEnd: TurnEndBlock | undefined): number | undefined {
	return turnEnd !== undefined
		? (turnEnd.endedAt ?? turnEnd.startedAt)
		: undefined;
}

function getElapsedMs(start: number, end: number): number {
	return Math.max(0, end - start);
}

function getResponseTiming(
	responseStartedAt: number | undefined,
	end: number,
): Pick<ConversationTurnTiming, 'responseStartedAt' | 'responseDurationMs'> {
	if (responseStartedAt === undefined) return {};

	return {
		responseStartedAt,
		responseDurationMs: getElapsedMs(responseStartedAt, end),
	};
}

export function getConversationTurnTiming(
	turn: ConversationTurn,
	now: number,
): ConversationTurnTiming {
	const promptedAt = getPromptedAt(turn);
	const responseStartedAt = getResponseStartedAt(turn);
	const turnEnd = getConversationTurnEnd(turn);
	const completedAt = getCompletedAt(turnEnd);
	const end = completedAt ?? now;
	const timing: ConversationTurnTiming = {
		promptedAt,
		elapsedMs: getElapsedMs(promptedAt, end),
		...getResponseTiming(responseStartedAt, end),
	};

	if (completedAt !== undefined) {
		timing.completedAt = completedAt;
	}

	return timing;
}
