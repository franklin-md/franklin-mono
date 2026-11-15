import { describe, expect, it } from 'vitest';
import type { CompactionEntry, MessageEntry } from '../types.js';
import { projectEntries } from '../project.js';

function message(text: string): MessageEntry {
	return {
		type: 'message',
		message: { role: 'user', content: [{ type: 'text', text }] },
	};
}

function fence(summary: string): CompactionEntry {
	return { type: 'compaction', summary };
}

describe('session history projection', () => {
	it('projects an empty log and an unfenced log without changing messages', () => {
		const entries = [message('a'), message('b')];
		expect(projectEntries([])).toEqual([]);
		expect(projectEntries(entries)).toEqual(
			entries.map((entry) => entry.message),
		);
	});

	it('hides every preceding message and accumulates messages after the fence', () => {
		const entries = [message('a'), message('b'), fence('first'), message('c')];
		const original = structuredClone(entries);
		expect(projectEntries(entries)).toEqual([
			message('Conversation summary:\nfirst').message,
			message('c').message,
		]);
		expect(entries).toEqual(original);
	});

	it('replaces earlier summaries atomically across repeated fences', () => {
		const entries = [
			message('a'),
			message('b'),
			fence('first'),
			message('c'),
			fence('second'),
			message('d'),
		];
		const original = structuredClone(entries);
		expect(projectEntries(entries)).toEqual([
			message('Conversation summary:\nsecond').message,
			message('d').message,
		]);
		expect(entries).toEqual(original);
	});

	it('can start with a checkpoint and replace it with a consecutive checkpoint', () => {
		expect(
			projectEntries([fence('first'), fence('second'), message('c')]),
		).toEqual([
			message('Conversation summary:\nsecond').message,
			message('c').message,
		]);
	});

	it('leaves only the summary when the last entry is a checkpoint', () => {
		expect(projectEntries([message('a'), fence('first')])).toEqual([
			message('Conversation summary:\nfirst').message,
		]);
	});

	it('accepts repeated identical entries in log order without assigning identities', () => {
		const repeated = message('same');
		expect(projectEntries([repeated, repeated])).toEqual([
			repeated.message,
			repeated.message,
		]);
		expect(projectEntries([fence('same'), fence('same'), repeated])).toEqual([
			message('Conversation summary:\nsame').message,
			repeated.message,
		]);
	});

	it('rejects empty summaries', () => {
		expect(() => projectEntries([fence('  ')])).toThrow('summary');
	});

	it('preserves tool-call identifiers inside messages while hiding completed exchanges', () => {
		const call: MessageEntry = {
			type: 'message',
			message: {
				role: 'assistant',
				content: [
					{ type: 'toolCall', id: 'tool', name: 'lookup', arguments: {} },
				],
			},
		};
		const result: MessageEntry = {
			type: 'message',
			message: {
				role: 'toolResult',
				toolCallId: 'tool',
				content: [{ type: 'text', text: 'found' }],
			},
		};
		expect(projectEntries([call, result])).toEqual([
			call.message,
			result.message,
		]);
		const entries = [call, result, fence('first'), message('b')];
		const original = structuredClone(entries);
		expect(projectEntries(entries)).toEqual([
			message('Conversation summary:\nfirst').message,
			message('b').message,
		]);
		expect(entries).toEqual(original);
	});
});
