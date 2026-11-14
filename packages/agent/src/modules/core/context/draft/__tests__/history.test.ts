import { describe, expect, it } from 'vitest';
import { createMessageEntries } from '../../../history/create.js';
import { emptySessionSnapshot } from '../../../state.js';
import { SessionDraft } from '../session.js';

function seededDraft() {
	const entries = createMessageEntries(
		[
			{ role: 'user', content: [{ type: 'text', text: 'old' }] },
			{ role: 'user', content: [{ type: 'text', text: 'retained' }] },
		],
		'seed',
	);
	return SessionDraft.fromSnapshot({ ...emptySessionSnapshot(), entries });
}

describe('durable draft history', () => {
	it('appends checkpoints without changing raw messages or stable IDs', async () => {
		const draft = seededDraft();
		const original = draft.getEntries();
		draft.appendCheckpoint({
			type: 'compaction',
			id: 'first',
			summary: 'old summary',
		});
		draft.appendCheckpoint({
			type: 'compaction',
			id: 'second',
			summary: 'new summary',
		});
		const entries = draft.getEntries();
		await draft.commit();
		await draft.commit();
		expect(draft.getEntries()).toEqual([...original, ...entries.slice(2)]);
		expect(draft.get().messages).toEqual([
			{
				role: 'user',
				content: [{ type: 'text', text: 'Conversation summary:\nnew summary' }],
			},
		]);
	});

	it('rejects invalid checkpoints atomically', () => {
		const draft = seededDraft();
		const original = draft.getEntries();
		const context = draft.get();
		const revision = draft.revision('messages');
		expect(() =>
			draft.appendCheckpoint({
				type: 'compaction',
				id: 'seed-0',
				summary: 'summary',
			}),
		).toThrow('id');
		expect(draft.getEntries()).toEqual(original);
		expect(draft.get()).toEqual(context);
		expect(draft.revision('messages')).toBe(revision);
	});

	it('owns copies of snapshot, append, checkpoint and returned history data', () => {
		const snapshot = {
			...emptySessionSnapshot(),
			entries: createMessageEntries(
				[{ role: 'user', content: [{ type: 'text', text: 'original' }] }],
				'seed',
			),
		};
		const draft = SessionDraft.fromSnapshot(snapshot);
		snapshot.entries[0]!.message.content.length = 0;
		const message = {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'answer' }],
		};
		draft.append(message);
		message.content.length = 0;
		const checkpoint = {
			type: 'compaction' as const,
			id: 'fence',
			summary: 'summary',
		};
		draft.appendCheckpoint(checkpoint);
		checkpoint.summary = 'mutated';
		const entries = draft.getEntries();
		entries.length = 0;
		draft.get().messages.length = 0;
		expect(draft.getEntries()).toMatchObject([
			{
				id: 'seed-0',
				message: { content: [{ type: 'text', text: 'original' }] },
			},
			{
				id: expect.any(String),
				message: { content: [{ type: 'text', text: 'answer' }] },
			},
			{ id: 'fence', summary: 'summary' },
		]);
	});

	it('treats only an explicit messages patch as a deliberate durable history reset', () => {
		const draft = seededDraft();
		draft.appendCheckpoint({
			type: 'compaction',
			id: 'fence',
			summary: 'summary',
		});
		const entries = draft.getEntries();
		draft.apply({
			config: { model: 'new-model' },
			systemPrompt: 'system',
			tools: [],
		});
		expect(draft.getEntries()).toEqual(entries);
		const messages = [
			{
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'replacement' }],
			},
		];
		draft.apply({ messages });
		expect(draft.getEntries()).toEqual([
			{ type: 'message', id: expect.any(String), message: messages[0] },
		]);
		expect(draft.getEntries()[0]?.id).not.toBe('seed-0');
		expect(draft.get().config.model).toBe('new-model');
		draft.apply({ messages: [] });
		expect(draft.getEntries()).toEqual([]);
	});
});
