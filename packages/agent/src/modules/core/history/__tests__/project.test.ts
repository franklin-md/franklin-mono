import { describe, expect, it } from 'vitest';
import type { CompactionEntry, MessageEntry, SessionEntry } from '../types.js';
import { projectEntries } from '../project.js';

function message(id: string): MessageEntry {
	return {
		type: 'message',
		id,
		message: { role: 'user', content: [{ type: 'text', text: id }] },
	};
}

function fence(id: string): CompactionEntry {
	return { type: 'compaction', id, summary: `summary ${id}` };
}

describe('session history projection', () => {
	it('projects an empty log and an unfenced log without changing messages', () => {
		const entries = [message('a'), message('b')];
		expect(projectEntries([])).toEqual([]);
		expect(projectEntries(entries)).toEqual(entries);
	});

	it('hides every preceding message and accumulates messages after the fence', () => {
		const entries = [message('a'), message('b'), fence('first'), message('c')];
		const original = structuredClone(entries);
		const projected = projectEntries(entries);
		expect(projected.map((entry) => entry.id)).toEqual(['first', 'c']);
		expect(projected[0]?.message).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'Conversation summary:\nsummary first' }],
		});
		expect(entries).toEqual(original);
	});

	it('replaces earlier summaries atomically across repeated fences', () => {
		const entries = [
			message('a'),
			message('b'),
			message('c'),
			fence('first'),
			message('d'),
			fence('second'),
			message('e'),
		];
		const original = structuredClone(entries);
		expect(projectEntries(entries).map((entry) => entry.id)).toEqual([
			'second',
			'e',
		]);
		expect(entries).toEqual(original);
	});

	it('can start with a checkpoint and replace it with a consecutive checkpoint', () => {
		expect(
			projectEntries([fence('first'), fence('second'), message('c')]).map(
				(entry) => entry.id,
			),
		).toEqual(['second', 'c']);
	});

	it('leaves only the summary when the last entry is a checkpoint', () => {
		expect(
			projectEntries([message('a'), fence('first')]).map((entry) => entry.id),
		).toEqual(['first']);
	});

	it.each([
		[message('a'), message('a')],
		[message('a'), fence('a')],
		[message('a'), fence('first'), message('a')],
		[message('')],
		[fence('')],
		[message('  ')],
	])('rejects invalid or reused entry IDs', (...entries: SessionEntry[]) => {
		expect(() => projectEntries(entries)).toThrow(/id/i);
	});

	it('rejects empty summaries', () => {
		expect(() =>
			projectEntries([{ ...fence('first'), summary: '  ' }]),
		).toThrow('summary');
	});

	it('hides completed tool exchanges with the rest of the prefix', () => {
		const call: MessageEntry = {
			type: 'message',
			id: 'call',
			message: {
				role: 'assistant',
				content: [
					{ type: 'toolCall', id: 'tool', name: 'lookup', arguments: {} },
				],
			},
		};
		const result: MessageEntry = {
			type: 'message',
			id: 'result',
			message: {
				role: 'toolResult',
				toolCallId: 'tool',
				content: [{ type: 'text', text: 'found' }],
			},
		};
		const entries = [message('a'), call, result, fence('first'), message('b')];
		const original = structuredClone(entries);
		expect(projectEntries(entries).map((entry) => entry.id)).toEqual([
			'first',
			'b',
		]);
		expect(entries).toEqual(original);
	});
});
