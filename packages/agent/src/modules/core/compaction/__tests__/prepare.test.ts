import { describe, expect, it } from 'vitest';
import type { MessageEntry } from '../../history/types.js';
import { prepareCompaction } from '../prepare.js';

const user = (id: string, text = id): MessageEntry => ({
	type: 'message',
	id,
	message: { role: 'user', content: [{ type: 'text', text }] },
});

describe('compaction preparation', () => {
	it('keeps recent messages and summarizes the previous summary with the discarded prefix', () => {
		const entries = [
			user('summary'),
			user('older'),
			user('recent', 'x'.repeat(400)),
		];
		const prepared = prepareCompaction(entries, 50);
		expect(prepared?.firstKeptEntryId).toBe('recent');
		expect(prepared?.messages).toEqual(
			entries.slice(0, 2).map((entry) => entry.message),
		);
	});

	it('never splits overlapping tool calls from their results', () => {
		const entries: MessageEntry[] = [
			user('old'),
			{
				type: 'message',
				id: 'calls',
				message: {
					role: 'assistant',
					content: [
						{ type: 'toolCall', id: 'one', name: 'read', arguments: {} },
						{ type: 'toolCall', id: 'two', name: 'read', arguments: {} },
					],
				},
			},
			{
				type: 'message',
				id: 'result-one',
				message: {
					role: 'toolResult',
					toolCallId: 'one',
					content: [{ type: 'text', text: 'x'.repeat(400) }],
				},
			},
			{
				type: 'message',
				id: 'result-two',
				message: {
					role: 'toolResult',
					toolCallId: 'two',
					content: [{ type: 'text', text: 'y'.repeat(400) }],
				},
			},
		];
		expect(prepareCompaction(entries, 1)?.firstKeptEntryId).toBe('calls');
	});

	it('does not compact when there is no prefix that can be removed', () => {
		expect(prepareCompaction([user('only')], 100)).toBeUndefined();
	});
});
