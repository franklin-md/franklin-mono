import type { ConversationTurn, TurnEndBlock } from '@franklin/extensions';

export type ConversationTurnPhase = 'in-progress' | 'complete';

export type ConversationTurnTiming = {
	promptedAt: number;
	responseStartedAt?: number;
	completedAt?: number;
	elapsedMs: number;
	responseDurationMs?: number;
};

export type ConversationRenderTurn = ConversationTurn & {
	index: number;
	isLast: boolean;
	phase: ConversationTurnPhase;
	turnEnd?: TurnEndBlock;
	timing: ConversationTurnTiming;
};
