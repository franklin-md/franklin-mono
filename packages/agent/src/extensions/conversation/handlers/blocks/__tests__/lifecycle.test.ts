import { afterEach, describe, it, expect, vi } from 'vitest';

import { StopCode } from '@franklin/mini-acp';

import type { ConversationTurn } from '../../../types.js';
import { handleChunk } from '../../chunk.js';
import { handleToolCall } from '../../tool-call.js';
import { handleToolResult } from '../../tool-result.js';
import { handleTurnEnd } from '../../turn-end.js';
import { endBlock, endLastBlock } from '../end.js';
import { startAndEndNewBlock, startBlock, startNewBlock } from '../start.js';

function emptyTurn(): ConversationTurn {
	return {
		id: 't',
		timestamp: 0,
		prompt: { role: 'user', content: [{ type: 'text', text: 'hi' }] },
		response: { blocks: [] },
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('startBlock', () => {
	it('pushes a block without touching the trailing one', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'first' }, 100);
		startBlock(turn, 'text', { text: 'second' }, 200);

		expect(turn.response.blocks).toHaveLength(2);
		expect(turn.response.blocks[0]!.endedAt).toBeUndefined();
		expect(turn.response.blocks[1]!.endedAt).toBeUndefined();
	});

	it('uses Date.now() when no timestamp is passed', () => {
		const turn = emptyTurn();
		const before = Date.now();
		startBlock(turn, 'text', { text: 'hi' });
		const after = Date.now();

		const startedAt = turn.response.blocks[0]!.startedAt;
		expect(startedAt).toBeGreaterThanOrEqual(before);
		expect(startedAt).toBeLessThanOrEqual(after);
	});

	it('returns the pushed block, narrowed to the requested kind', () => {
		const turn = emptyTurn();
		const block = startBlock(
			turn,
			'toolUse',
			{
				call: {
					type: 'toolCall',
					id: 'tc1',
					name: 'read_file',
					arguments: { path: '/foo' },
				},
				result: undefined,
			},
			100,
		);

		expect(block.kind).toBe('toolUse');
		expect(block.call.id).toBe('tc1');
		expect(block.startedAt).toBe(100);
	});
});

describe('endBlock', () => {
	it('sets endedAt on the given block', () => {
		const turn = emptyTurn();
		const block = startBlock(turn, 'text', { text: 'open' }, 100);
		endBlock(block, 150);

		expect(block.endedAt).toBe(150);
	});

	it('uses Date.now() when no timestamp is passed', () => {
		const turn = emptyTurn();
		const block = startBlock(turn, 'text', { text: 'open' }, 100);
		const before = Date.now();
		endBlock(block);
		const after = Date.now();

		expect(block.endedAt!).toBeGreaterThanOrEqual(before);
		expect(block.endedAt!).toBeLessThanOrEqual(after);
	});

	it('is idempotent — does not overwrite an already-closed block', () => {
		const turn = emptyTurn();
		const block = startBlock(turn, 'text', { text: 'open' }, 100);
		endBlock(block, 120);
		endBlock(block, 150);

		expect(block.endedAt).toBe(120);
	});
});

describe('endLastBlock', () => {
	it('closes the trailing block when it is still open', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'open' }, 100);
		endLastBlock(turn, 150);

		expect(turn.response.blocks[0]!.endedAt).toBe(150);
	});

	it('is a no-op on an empty turn', () => {
		const turn = emptyTurn();
		endLastBlock(turn, 150);
		expect(turn.response.blocks).toHaveLength(0);
	});

	it('does not overwrite an already-closed trailing block', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'closed' }, 100);
		endLastBlock(turn, 120);
		endLastBlock(turn, 150);

		expect(turn.response.blocks[0]!.endedAt).toBe(120);
	});
});

describe('startNewBlock', () => {
	it('pushes onto an empty turn without closing anything', () => {
		const turn = emptyTurn();
		const block = startNewBlock(turn, 'text', { text: 'first' });

		expect(turn.response.blocks).toHaveLength(1);
		expect(block.endedAt).toBeUndefined();
	});

	it("closes an open trailing block at the new block's startedAt — no drift", () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'a' }, 100);
		const second = startNewBlock(turn, 'thinking', { text: 'b' });

		expect(turn.response.blocks[0]!.endedAt).toBe(second.startedAt);
	});

	it('does not re-close a trailing block that is already closed', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'a' }, 100);
		endLastBlock(turn, 120);
		const second = startNewBlock(turn, 'thinking', { text: 'b' });

		expect(turn.response.blocks[0]!.endedAt).toBe(120);
		expect(second.startedAt).toBeGreaterThanOrEqual(120);
	});

	it('produces contiguous timestamps across many sequential blocks', () => {
		const turn = emptyTurn();
		for (let i = 0; i < 5; i++) {
			startNewBlock(turn, 'text', { text: `block ${i}` });
		}

		const blocks = turn.response.blocks;
		expect(blocks).toHaveLength(5);
		for (let i = 0; i < blocks.length - 1; i++) {
			expect(blocks[i]!.endedAt).toBe(blocks[i + 1]!.startedAt);
		}
		expect(blocks[blocks.length - 1]!.endedAt).toBeUndefined();
	});
});

describe('startAndEndNewBlock', () => {
	it('pushes a block with startedAt === endedAt', () => {
		const turn = emptyTurn();
		const block = startAndEndNewBlock(turn, 'turnEnd', {
			stopCode: StopCode.Finished,
		});

		expect(block.startedAt).toBe(block.endedAt);
	});

	it('closes the trailing open block at the same moment', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'open' }, 100);
		const instant = startAndEndNewBlock(turn, 'turnEnd', {
			stopCode: StopCode.Finished,
		});

		expect(turn.response.blocks[0]!.endedAt).toBe(instant.startedAt);
	});
});

describe('tool call lifecycle', () => {
	it('keeps overlapping tool calls open until each matching result arrives', () => {
		const now = vi.spyOn(Date, 'now');
		const turn = emptyTurn();

		now.mockReturnValue(100);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'spawn',
				arguments: { name: 'First', prompt: 'Do first' },
			},
		});

		now.mockReturnValue(125);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc2',
				name: 'spawn',
				arguments: { name: 'Second', prompt: 'Do second' },
			},
		});

		expect(turn.response.blocks).toHaveLength(2);
		expect(turn.response.blocks[0]).toMatchObject({
			kind: 'toolUse',
			startedAt: 100,
		});
		expect(turn.response.blocks[0]!.endedAt).toBeUndefined();
		expect(turn.response.blocks[1]).toMatchObject({
			kind: 'toolUse',
			startedAt: 125,
		});
		expect(turn.response.blocks[1]!.endedAt).toBeUndefined();

		now.mockReturnValue(500);
		handleToolResult(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'spawn',
				arguments: { name: 'First', prompt: 'Do first' },
			},
			result: {
				content: [{ type: 'text', text: 'first done' }],
			},
		});

		expect(turn.response.blocks[0]!.endedAt).toBe(500);
		expect(turn.response.blocks[1]!.endedAt).toBeUndefined();

		now.mockReturnValue(900);
		handleToolResult(turn, {
			call: {
				type: 'toolCall',
				id: 'tc2',
				name: 'spawn',
				arguments: { name: 'Second', prompt: 'Do second' },
			},
			result: {
				content: [{ type: 'text', text: 'second done' }],
			},
		});

		expect(turn.response.blocks[1]!.endedAt).toBe(900);
	});

	it('does not close an open tool call when assistant text starts', () => {
		const now = vi.spyOn(Date, 'now');
		const turn = emptyTurn();

		now.mockReturnValue(100);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'spawn',
				arguments: { name: 'Worker', prompt: 'Do work' },
			},
		});

		now.mockReturnValue(250);
		handleChunk(turn, {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'Meanwhile' },
		});

		expect(turn.response.blocks).toHaveLength(2);
		expect(turn.response.blocks[0]).toMatchObject({
			kind: 'toolUse',
			startedAt: 100,
		});
		expect(turn.response.blocks[0]!.endedAt).toBeUndefined();
		expect(turn.response.blocks[1]).toMatchObject({
			kind: 'text',
			text: 'Meanwhile',
			startedAt: 250,
		});
		expect(turn.response.blocks[1]!.endedAt).toBeUndefined();
	});

	it('closes only the trailing sequential block when another tool call starts', () => {
		const now = vi.spyOn(Date, 'now');
		const turn = emptyTurn();

		now.mockReturnValue(100);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'spawn',
				arguments: { name: 'Worker', prompt: 'Do work' },
			},
		});

		now.mockReturnValue(250);
		handleChunk(turn, {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'thinking', text: 'Meanwhile' },
		});

		now.mockReturnValue(300);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc2',
				name: 'spawn',
				arguments: { name: 'Second', prompt: 'Do second' },
			},
		});

		expect(turn.response.blocks).toHaveLength(3);
		expect(turn.response.blocks[0]).toMatchObject({
			kind: 'toolUse',
			startedAt: 100,
		});
		expect(turn.response.blocks[0]!.endedAt).toBeUndefined();
		expect(turn.response.blocks[1]).toMatchObject({
			kind: 'thinking',
			text: 'Meanwhile',
			startedAt: 250,
			endedAt: 300,
		});
		expect(turn.response.blocks[2]).toMatchObject({
			kind: 'toolUse',
			startedAt: 300,
		});
		expect(turn.response.blocks[2]!.endedAt).toBeUndefined();
	});

	it('closes unresolved tool calls when the turn ends', () => {
		const now = vi.spyOn(Date, 'now');
		const turn = emptyTurn();

		now.mockReturnValue(100);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'spawn',
				arguments: { name: 'First', prompt: 'Do first' },
			},
		});

		now.mockReturnValue(125);
		handleToolCall(turn, {
			call: {
				type: 'toolCall',
				id: 'tc2',
				name: 'spawn',
				arguments: { name: 'Second', prompt: 'Do second' },
			},
		});

		now.mockReturnValue(1000);
		handleTurnEnd(turn, { type: 'turnEnd', stopCode: StopCode.Finished });

		expect(turn.response.blocks[0]!.endedAt).toBe(1000);
		expect(turn.response.blocks[1]!.endedAt).toBe(1000);
		expect(turn.response.blocks[2]).toMatchObject({
			kind: 'turnEnd',
			startedAt: 1000,
			endedAt: 1000,
		});
	});
});

// Orphan tool-result fallback: an event arrives with no matching open
// toolUse block. This path is exercised by handleToolResult directly
// because the full stream pipeline always produces the toolCall first —
// there is no client-side way to trigger a tool-result without a prior
// call through the middleware.
describe('handleToolResult (orphan fallback)', () => {
	it('pushes an instantaneous toolUse when no matching block exists', () => {
		const turn = emptyTurn();
		handleToolResult(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
			result: {
				content: [{ type: 'text', text: 'result' }],
			},
		});

		const [block] = turn.response.blocks;
		expect(block!.kind).toBe('toolUse');
		expect(block!.startedAt).toBe(block!.endedAt);
	});

	it('closes a dangling trailing block at the fallback block startedAt', () => {
		const turn = emptyTurn();
		startBlock(turn, 'text', { text: 'open' }, 100);
		handleToolResult(turn, {
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: {},
			},
			result: {
				content: [{ type: 'text', text: 'result' }],
			},
		});

		const [trailing, fallback] = turn.response.blocks;
		expect(trailing!.endedAt).toBe(fallback!.startedAt);
	});
});
