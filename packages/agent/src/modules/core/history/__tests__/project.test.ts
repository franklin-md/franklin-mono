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

function fence(id: string, firstKeptEntryId: string | null): CompactionEntry {
	return { type: 'compaction', id, summary: `summary ${id}`, firstKeptEntryId };
}

describe('session history projection', () => {
	it('projects an empty log and an unfenced log without changing messages', () => {
		const entries = [message('a'), message('b')];
		expect(projectEntries([])).toEqual([]);
		expect(projectEntries(entries)).toEqual(entries);
	});

	it('replaces the prefix with a summary and retains messages around the fence', () => {
		const entries = [
			message('a'),
			message('b'),
			fence('first', 'b'),
			message('c'),
		];
		const original = structuredClone(entries);
		const projected = projectEntries(entries);
		expect(projected.map((entry) => entry.id)).toEqual(['first', 'b', 'c']);
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
			fence('first', 'b'),
			message('d'),
			fence('second', 'c'),
			message('e'),
		];
		const original = structuredClone(entries);
		expect(projectEntries(entries).map((entry) => entry.id)).toEqual([
			'second',
			'c',
			'd',
			'e',
		]);
		expect(entries).toEqual(original);
	});

	it('can retain none, including after an earlier fence', () => {
		expect(
			projectEntries([
				message('a'),
				fence('first', null),
				message('b'),
				fence('second', null),
				message('c'),
			]).map((entry) => entry.id),
		).toEqual(['second', 'c']);
	});

	it.each(['missing', 'future', 'first', 'a'])(
		'rejects unavailable or synthetic boundary %s',
		(boundary) => {
			expect(() =>
				projectEntries([
					message('a'),
					message('b'),
					fence('first', 'b'),
					fence('second', boundary),
					message('future'),
				]),
			).toThrow('boundary');
		},
	);

	it.each([
		[message('a'), message('a')],
		[message('a'), fence('a', null)],
		[message('a'), fence('first', null), message('a')],
		[message('')],
		[fence('', null)],
	])('rejects invalid or reused entry IDs', (...entries: SessionEntry[]) => {
		expect(() => projectEntries(entries)).toThrow(/id/i);
	});

	it('rejects empty summaries', () => {
		expect(() =>
			projectEntries([{ ...fence('first', null), summary: '  ' }]),
		).toThrow('summary');
	});

	it('keeps tool exchanges whole and rejects boundaries inside them', () => {
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
		const entries = [message('a'), call, result, message('b')];
		expect(
			projectEntries([...entries, fence('first', 'call')]).map(
				(entry) => entry.id,
			),
		).toEqual(['first', 'call', 'result', 'b']);
		expect(
			projectEntries([...entries, fence('first', 'b')]).map(
				(entry) => entry.id,
			),
		).toEqual(['first', 'b']);
		expect(() =>
			projectEntries([...entries, fence('first', 'result')]),
		).toThrow('boundary');
		expect(() =>
			projectEntries([
				call,
				message('interleaved'),
				result,
				fence('first', 'interleaved'),
			]),
		).toThrow('boundary');
		expect(() => projectEntries([call, fence('first', null)])).toThrow(
			'boundary',
		);
	});
});
