import { describe, expect, it, vi } from 'vitest';
import { InboxController } from '../controller/index.js';
import type { AnswerRequest } from '../controller/types.js';
import { inboxCodec } from '../controller/schema.js';
import { createInboxTestPersistence } from '../testing/persistence.js';

const defaults = {
	provider: 'openai-codex',
	model: 'test-model',
	reasoning: 'low' as const,
};
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

async function harness(concurrency = 2) {
	const storage = createInboxTestPersistence();
	vi.spyOn(storage.disk, 'save');
	const pending: AnswerRequest[] = [];
	const gates = new Map<string, ReturnType<typeof deferred>>();
	const run = vi.fn(async (request: AnswerRequest) => {
		pending.push(request);
		const gate = deferred();
		gates.set(request.question.id, gate);
		await gate.promise;
	});
	const inbox = await InboxController.create({
		persistence: storage.disk,
		defaults,
		run,
	});
	await inbox.configure({ concurrency });
	return {
		...storage,
		inbox,
		pending,
		run,
		finish: async (id: string) => {
			gates.get(id)?.resolve();
			await vi.waitFor(() =>
				expect(
					inbox.state.get().questions.find((q) => q.id === id)?.state.kind,
				).not.toBe('running'),
			);
		},
	};
}

describe('study inbox controller', () => {
	it('bounds parallel work, accepts out-of-order answers, and holds the slot until the agent settles', async () => {
		const h = await harness(2);
		const one = await h.inbox.add('one');
		const two = await h.inbox.add('two');
		const three = await h.inbox.add('three');
		await vi.waitFor(() => expect(h.pending).toHaveLength(2));
		const second = h.pending.find((r) => r.question.id === two)!;
		await second.submit('second answer');
		expect(h.run).toHaveBeenCalledTimes(2);
		await expect(second.submit('duplicate')).rejects.toThrow(
			'no longer accepting',
		);
		await h.finish(two);
		await vi.waitFor(() => expect(h.pending).toHaveLength(3));
		expect(h.pending[2]?.question.id).toBe(three);
		await h.pending.find((r) => r.question.id === one)!.submit('first answer');
		await h.finish(one);
		await h.pending
			.find((r) => r.question.id === three)!
			.submit('third answer');
		await h.finish(three);
		expect(h.read()?.questions.every((q) => q.state.kind === 'answered')).toBe(
			true,
		);
		await h.inbox.dispose();
	});

	it('retries with its original model and instructions, and rejects stale/deleted submissions', async () => {
		const h = await harness(1);
		await h.inbox.configure({ answerInstructions: 'Original instructions' });
		const id = await h.inbox.add('question');
		await vi.waitFor(() => expect(h.pending).toHaveLength(1));
		const old = h.pending[0]!;
		await h.finish(id);
		expect(h.inbox.state.get().questions[0]?.state.kind).toBe('failed');
		await h.inbox.configure({
			model: 'other-model',
			answerInstructions: 'New instructions',
		});
		await h.inbox.retry(id);
		await vi.waitFor(() => expect(h.pending).toHaveLength(2));
		const next = h.pending[1]!;
		expect(next.question.model).toBe('test-model');
		expect(next.question.answerInstructions).toBe('Original instructions');
		expect(next.question.attemptId).not.toBe(old.question.attemptId);
		await expect(old.submit('stale')).rejects.toThrow('no longer accepting');
		await h.inbox.remove(id);
		expect(next.signal.aborted).toBe(true);
		await expect(next.submit('late')).rejects.toThrow('no longer accepting');
		await h.finish(id);
		expect(h.read()?.questions).toEqual([]);
		await h.inbox.dispose();
	});

	it('carries only the chosen ancestor branch and captured source into a follow-up, and deletes descendants', async () => {
		const h = await harness(3);
		const source = { note: 'Note', heading: 'Section', quote: 'source text' };
		const root = await h.inbox.add('root', { source });
		await vi.waitFor(() => expect(h.pending).toHaveLength(1));
		await h.pending[0]!.submit('root answer');
		await h.finish(root);
		await h.inbox.configure({
			answerInstructions: 'Explain the next question in detail.',
		});
		const child = await h.inbox.add('child', { parentId: root });
		const sibling = await h.inbox.add('sibling', { parentId: root });
		await vi.waitFor(() => expect(h.pending).toHaveLength(3));
		const childRequest = h.pending.find((r) => r.question.id === child)!;
		expect(childRequest.question.answerInstructions).toBe(
			'Explain the next question in detail.',
		);
		expect(childRequest.ancestors[0]?.answerInstructions).not.toBe(
			childRequest.question.answerInstructions,
		);
		await childRequest.submit('child answer');
		await h.finish(child);
		const grandchild = await h.inbox.add('grandchild', { parentId: child });
		await vi.waitFor(() => expect(h.pending).toHaveLength(4));
		const last = h.pending.find((r) => r.question.id === grandchild)!;
		expect(last.ancestors.map((q) => q.id)).toEqual([root, child]);
		expect(last.question.source).toEqual(source);
		expect(last.question.rootId).toBe(root);
		await h.inbox.remove(root);
		expect(h.inbox.state.get().questions).toEqual([]);
		expect(last.signal.aborted).toBe(true);
		await h.finish(sibling);
		await h.finish(grandchild);
		await h.inbox.dispose();
	});

	it('restores queued work, marks running work interrupted, and keeps answered questions', async () => {
		const h = await harness(1);
		const answered = await h.inbox.add('answered');
		await vi.waitFor(() => expect(h.pending).toHaveLength(1));
		await h.pending[0]!.submit('saved answer');
		await h.finish(answered);
		const running = await h.inbox.add('running');
		await vi.waitFor(() => expect(h.pending).toHaveLength(2));
		const queued = await h.inbox.add('queued');
		const disk = createInboxTestPersistence(h.read());
		const requests: AnswerRequest[] = [];
		const restored = await InboxController.create({
			defaults,
			persistence: disk.disk,
			run: async (request) => {
				requests.push(request);
				await request.submit('resumed');
			},
		});
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0]?.question.id).toBe(queued);
		expect(
			restored.state.get().questions.find((q) => q.id === running)?.state.kind,
		).toBe('failed');
		expect(
			restored.state.get().questions.find((q) => q.id === answered)?.state,
		).toEqual({ kind: 'answered', answer: 'saved answer' });
		await restored.dispose();
		await h.inbox.dispose();
		await h.finish(running);
	});

	it('does not submit a request until its running state is saved; failed saves are visible and recoverable', async () => {
		const h = await harness(1);
		vi.mocked(h.disk.save).mockRejectedValueOnce(new Error('disk full'));
		await expect(h.inbox.add('unsaved')).rejects.toThrow('disk full');
		expect(h.run).not.toHaveBeenCalled();
		expect(h.inbox.state.get().storageError).toContain('disk full');
		await h.inbox.retrySave();
		await vi.waitFor(() => expect(h.pending).toHaveLength(1));
		expect(h.inbox.state.get().storageError).toBeUndefined();
		await h.inbox.dispose();
		await h.finish(h.pending[0]!.question.id);
	});

	it('preserves unreadable storage instead of overwriting it', async () => {
		const h = createInboxTestPersistence();
		const save = vi.spyOn(h.disk, 'save');
		h.disk.load = async () => ({
			value: undefined,
			issues: [
				{ kind: 'corrupt-json', path: 'inbox.json', error: 'invalid' },
			] as never,
		});
		await expect(
			InboxController.create({ defaults, persistence: h.disk, run: vi.fn() }),
		).rejects.toThrow('preserved');
		expect(save).not.toHaveBeenCalled();
	});

	it('rejects blank IDs and conflicting reuse before writing', async () => {
		const h = await harness();
		const id = await h.inbox.add('Original question', { id: 'question-id' });
		await vi.waitFor(() => expect(h.pending).toHaveLength(1));
		const save = vi.mocked(h.disk.save);
		save.mockClear();

		await expect(h.inbox.add('Blank ID', { id: '' })).rejects.toThrow(
			'Question ID must not be empty',
		);
		await expect(h.inbox.add('Blank ID', { id: '  ' })).rejects.toThrow(
			'Question ID must not be empty',
		);
		await expect(h.inbox.add('Different text', { id })).rejects.toThrow(
			'Question ID already belongs to a different submission',
		);
		await expect(
			h.inbox.add('Original question', { id, parentId: 'other-thread' }),
		).rejects.toThrow('Question ID already belongs to a different submission');
		expect(save).not.toHaveBeenCalled();
		expect(
			h.read()?.questions.map((question) => [question.id, question.text]),
		).toEqual([[id, 'Original question']]);

		await h.inbox.dispose();
		await h.finish(id);
	});

	it('validates versioned data, including cycles and missing lineage', async () => {
		const h = await harness();
		await h.inbox.add('example');
		const document = h.read()!;
		expect(inboxCodec.decode(inboxCodec.encode(document)).ok).toBe(true);
		document.questions[0]!.parentId = document.questions[0]!.id;
		expect(inboxCodec.decode(inboxCodec.encode(document)).ok).toBe(false);
		expect(inboxCodec.decode({ version: 100, data: {} }).ok).toBe(false);
		await h.inbox.dispose();
	});
});
