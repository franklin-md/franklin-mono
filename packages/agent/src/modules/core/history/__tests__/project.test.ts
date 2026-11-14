import { describe, expect, it } from 'vitest';
import type { SessionEntry } from '../types.js';
import { projectEntries } from '../project.js';

const message = (id: string): SessionEntry => ({
	type: 'message',
	id,
	message: { role: 'user', content: [{ type: 'text', text: id }] },
});

describe('session history projection', () => {
	it('keeps the retained messages on both sides of the latest compaction', () => {
		const entries: SessionEntry[] = [
			message('a'),
			message('b'),
			message('c'),
			{
				type: 'compaction',
				id: 'first',
				summary: 'old summary',
				firstKeptEntryId: 'b',
			},
			message('d'),
			{
				type: 'compaction',
				id: 'second',
				summary: 'new summary',
				firstKeptEntryId: 'c',
			},
			message('e'),
		];
		expect(projectEntries(entries).map((entry) => entry.id)).toEqual([
			'second',
			'c',
			'd',
			'e',
		]);
		expect(projectEntries(entries)[0]?.message.content).toEqual([
			{ type: 'text', text: 'Conversation summary:\nnew summary' },
		]);
		expect(entries).toHaveLength(7);
	});

	it('can retain none of the preceding messages', () => {
		expect(
			projectEntries([
				message('a'),
				{
					type: 'compaction',
					id: 'compact',
					summary: 'summary',
					firstKeptEntryId: null,
				},
				message('b'),
			]).map((entry) => entry.id),
		).toEqual(['compact', 'b']);
	});

	it('rejects a missing retained boundary rather than silently dropping history', () => {
		expect(() =>
			projectEntries([
				{
					type: 'compaction',
					id: 'compact',
					summary: 'summary',
					firstKeptEntryId: 'missing',
				},
			]),
		).toThrow('boundary');
	});

	it('rejects a boundary that would resurrect previously compacted messages', () => {
		expect(() =>
			projectEntries([
				message('a'),
				message('b'),
				{
					type: 'compaction',
					id: 'first',
					summary: 'summary',
					firstKeptEntryId: 'b',
				},
				{
					type: 'compaction',
					id: 'second',
					summary: 'summary',
					firstKeptEntryId: 'a',
				},
			]),
		).toThrow('boundary');
	});
});
