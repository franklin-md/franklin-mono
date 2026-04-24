import { describe, expect, it, vi } from 'vitest';
import type {
	ConversationTurn,
	TextBlock,
	TurnEndBlock,
} from '@franklin/extensions';

import { getLastConversationRenderTurn } from '../get-last-turn.js';
import { getConversationTurnPhase } from '../get-phase.js';
import { getConversationTurnTiming } from '../get-timing.js';
import { getConversationTurnEnd } from '../get-turn-end.js';
import { getConversationRenderTurn } from '../get-turn.js';
import { getConversationRenderTurns } from '../get-turns.js';

const finishedStopCode = 1000 as TurnEndBlock['stopCode'];
const cancelledStopCode = 1001 as TurnEndBlock['stopCode'];
const llmErrorStopCode = 2000 as TurnEndBlock['stopCode'];

function textBlock(startedAt: number, endedAt?: number): TextBlock {
	return {
		kind: 'text',
		text: 'hello',
		startedAt,
		...(endedAt !== undefined ? { endedAt } : {}),
	};
}

function turnEndBlock(
	startedAt: number,
	endedAt?: number,
	stopCode: TurnEndBlock['stopCode'] = finishedStopCode,
): TurnEndBlock {
	return {
		kind: 'turnEnd',
		stopCode,
		startedAt,
		...(endedAt !== undefined ? { endedAt } : {}),
	};
}

function baseTurn(
	blocks: ConversationTurn['response']['blocks'] = [],
): ConversationTurn {
	return {
		id: 't1',
		timestamp: 1_000,
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: 'prompt' }],
		},
		response: { blocks },
	};
}

describe('getConversationTurnEnd', () => {
	it('returns undefined for turns with no terminal turnEnd block', () => {
		const priorTurnEnd = turnEndBlock(1_100, 1_100);
		const turn = baseTurn([priorTurnEnd, textBlock(1_200)]);

		expect(getConversationTurnEnd(baseTurn())).toBeUndefined();
		expect(getConversationTurnEnd(turn)).toBeUndefined();
	});

	it('returns the terminal turnEnd block', () => {
		const terminal = turnEndBlock(1_400, 1_450);

		expect(getConversationTurnEnd(baseTurn([textBlock(1_200), terminal]))).toBe(
			terminal,
		);
	});
});

describe('getConversationTurnPhase', () => {
	it('returns in-progress until a terminal turnEnd exists', () => {
		expect(getConversationTurnPhase(baseTurn())).toBe('in-progress');
		expect(getConversationTurnPhase(baseTurn([textBlock(1_200)]))).toBe(
			'in-progress',
		);
	});

	it('returns complete for every terminal turnEnd outcome', () => {
		for (const stopCode of [
			finishedStopCode,
			cancelledStopCode,
			llmErrorStopCode,
		]) {
			expect(
				getConversationTurnPhase(
					baseTurn([turnEndBlock(1_400, 1_400, stopCode)]),
				),
			).toBe('complete');
		}
	});
});

describe('getConversationTurnTiming', () => {
	it('uses the prompt timestamp and now while waiting', () => {
		expect(getConversationTurnTiming(baseTurn(), 1_500)).toEqual({
			promptedAt: 1_000,
			elapsedMs: 500,
		});
	});

	it('uses the first response block for active response duration', () => {
		expect(
			getConversationTurnTiming(baseTurn([textBlock(1_200)]), 1_700),
		).toEqual({
			promptedAt: 1_000,
			responseStartedAt: 1_200,
			elapsedMs: 700,
			responseDurationMs: 500,
		});
	});

	it('uses terminal endedAt when the turn is complete', () => {
		expect(
			getConversationTurnTiming(
				baseTurn([textBlock(1_200, 1_350), turnEndBlock(1_500, 1_600)]),
				2_000,
			),
		).toEqual({
			promptedAt: 1_000,
			responseStartedAt: 1_200,
			completedAt: 1_600,
			elapsedMs: 600,
			responseDurationMs: 400,
		});
	});

	it('falls back to turnEnd startedAt when endedAt is missing', () => {
		expect(
			getConversationTurnTiming(baseTurn([turnEndBlock(1_400)]), 2_000),
		).toEqual({
			promptedAt: 1_000,
			responseStartedAt: 1_400,
			completedAt: 1_400,
			elapsedMs: 400,
			responseDurationMs: 0,
		});
	});

	it('clamps negative durations to zero', () => {
		expect(
			getConversationTurnTiming(baseTurn([textBlock(1_200)]), 900),
		).toEqual({
			promptedAt: 1_000,
			responseStartedAt: 1_200,
			elapsedMs: 0,
			responseDurationMs: 0,
		});
	});
});

describe('getConversationRenderTurn', () => {
	it('adds render metadata without replacing the source turn fields', () => {
		const terminal = turnEndBlock(1_400, 1_500);
		const turn = baseTurn([terminal]);
		const renderTurn = getConversationRenderTurn([turn], 0, 2_000);

		expect(renderTurn).toMatchObject({
			id: 't1',
			prompt: turn.prompt,
			response: turn.response,
			index: 0,
			isLast: true,
			phase: 'complete',
			turnEnd: terminal,
			timing: {
				promptedAt: 1_000,
				responseStartedAt: 1_400,
				completedAt: 1_500,
				elapsedMs: 500,
				responseDurationMs: 100,
			},
		});
	});

	it('returns undefined when the index does not exist', () => {
		expect(getConversationRenderTurn([], 0, 2_000)).toBeUndefined();
		expect(getConversationRenderTurn([baseTurn()], 1, 2_000)).toBeUndefined();
	});

	it('uses Date.now when now is not provided', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_750);
		try {
			expect(getConversationRenderTurn([baseTurn()], 0)?.timing.elapsedMs).toBe(
				750,
			);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('getConversationRenderTurns', () => {
	it('maps every turn with stable index and last-turn metadata', () => {
		const turns = [
			{ ...baseTurn(), id: 'a' },
			{ ...baseTurn(), id: 'b' },
		];

		expect(
			getConversationRenderTurns(turns, 2_000).map(({ id, index, isLast }) => ({
				id,
				index,
				isLast,
			})),
		).toEqual([
			{ id: 'a', index: 0, isLast: false },
			{ id: 'b', index: 1, isLast: true },
		]);
	});

	it('returns an empty array for no turns', () => {
		expect(getConversationRenderTurns([], 2_000)).toEqual([]);
	});
});

describe('getLastConversationRenderTurn', () => {
	it('returns the final render turn', () => {
		const turns = [
			{ ...baseTurn(), id: 'a' },
			{ ...baseTurn(), id: 'b' },
		];

		expect(getLastConversationRenderTurn(turns, 2_000)).toMatchObject({
			id: 'b',
			index: 1,
			isLast: true,
			timing: {
				elapsedMs: 1_000,
			},
		});
	});

	it('returns undefined when there are no turns', () => {
		expect(getLastConversationRenderTurn([], 2_000)).toBeUndefined();
	});
});
