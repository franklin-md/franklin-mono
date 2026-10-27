import { describe, expect, it, vi } from 'vitest';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { InboxController } from '../controller/controller.js';
import { inboxCodec } from '../controller/schema.js';
import type { ActionRequest } from '../actions/types.js';

const defaults = {
	provider: 'test',
	model: 'model',
	reasoning: 'low' as const,
};

async function setup(concurrency = 1) {
	const filesystem = new MemoryFilesystem();
	const disk = createSingleFilePersister(
		filesystem,
		toAbsolutePath('/inbox.json'),
		inboxCodec,
	);
	const save = vi.spyOn(disk, 'save');
	const requests: ActionRequest[] = [];
	const gates = new Map<
		string,
		{ resolve: (summary: string) => void; reject: (error: Error) => void }
	>();
	const runAction = vi.fn(
		(request: ActionRequest) =>
			new Promise<string>((resolve, reject) => {
				requests.push(request);
				gates.set(request.run.id, { resolve, reject });
			}),
	);
	const complete = vi.fn();
	const inbox = await InboxController.create({
		defaults,
		persistence: disk,
		run: async ({ submit }) => {
			await submit('Saved answer');
		},
		runAction,
		onActionComplete: complete,
	});
	await inbox.configure({ concurrency });
	await inbox.actions.save({
		id: 'cards',
		name: '🃏',
		prompt: 'Read [[Flashcard Design Prompt]] and create proposals.',
	});
	const question = await inbox.add('Why recheck?', undefined, {
		note: 'Sleep',
		heading: 'Waking',
		quote: 'Check again',
	});
	await vi.waitFor(() =>
		expect(inbox.state.get().questions[0]?.state.kind).toBe('answered'),
	);
	return { inbox, disk, save, requests, gates, runAction, complete, question };
}

describe('inbox actions', () => {
	it('reserves one run per action/question before saving, snapshots context, and removes only successful runs', async () => {
		const h = await setup();
		const ids = await Promise.all([
			h.inbox.actions.start(h.question, 'cards'),
			h.inbox.actions.start(h.question, 'cards'),
		]);
		expect(ids[0]).toBe(ids[1]);
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		const run = h.requests[0]!.run;
		expect(run.question.state).toEqual({
			kind: 'answered',
			answer: 'Saved answer',
		});
		expect(run.question.source?.quote).toBe('Check again');
		await h.inbox.actions.save({
			id: 'cards',
			name: 'Cards',
			prompt: 'Changed prompt',
		});
		await h.inbox.configure({ model: 'changed-model' });
		expect(run.action.name).toBe('🃏');
		expect(run.model).toBe('model');
		h.gates.get(run.id)!.resolve('Added 2 proposals');
		await vi.waitFor(() =>
			expect(h.complete).toHaveBeenCalledWith('🃏', 'Added 2 proposals'),
		);
		expect((await h.disk.load()).value?.actionRuns).toEqual([]);
		expect(h.inbox.state.get().questions).toHaveLength(1);
		expect(h.inbox.state.get().actions[0]?.name).toBe('Cards');
		const next = await h.inbox.actions.start(h.question, 'cards');
		expect(next).not.toBe(run.id);
		await vi.waitFor(() => expect(h.requests).toHaveLength(2));
		expect(h.requests[1]?.run.action.prompt).toBe('Changed prompt');
		await h.inbox.dispose();
		h.gates.get(next)!.resolve('late');
	});

	it('shares question slots, keeps separate pairs independent, and carries only the selected branch', async () => {
		const h = await setup();
		const child = await h.inbox.add('Child question', h.question);
		await vi.waitFor(() =>
			expect(h.inbox.state.get().questions[0]?.state.kind).toBe('answered'),
		);
		await h.inbox.actions.save({
			id: 'other',
			name: 'Notes',
			prompt: 'Save a note',
		});
		const first = await h.inbox.actions.start(child, 'cards');
		await h.inbox.actions.start(h.question, 'cards');
		await h.inbox.actions.start(child, 'other');
		await h.inbox.add('Queued behind action');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		expect(h.requests[0]?.run.ancestors.map((q) => q.id)).toEqual([h.question]);
		expect(h.inbox.state.get().questions[0]?.state.kind).toBe('queued');
		await h.inbox.configure({ concurrency: 3 });
		await vi.waitFor(() => expect(h.requests).toHaveLength(3));
		await h.inbox.remove(h.question);
		expect(h.requests.every((r) => r.signal.aborted)).toBe(true);
		expect(h.inbox.state.get().actionRuns).toEqual([]);
		h.gates.get(first)!.resolve('late');
		for (const [id, gate] of h.gates) if (id !== first) gate.resolve('late');
		await vi.waitFor(() =>
			expect(h.inbox.state.get().questions[0]?.state.kind).toBe('answered'),
		);
		expect(h.complete).not.toHaveBeenCalled();
		await h.inbox.dispose();
	});

	it('retains failed runs, retries with the same ID/configuration, and supports dismissing a deleted definition', async () => {
		const h = await setup();
		const id = await h.inbox.actions.start(h.question, 'cards');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		h.gates.get(id)!.reject(new Error('No write access'));
		await vi.waitFor(() =>
			expect(h.inbox.state.get().actionRuns[0]?.state).toEqual({
				kind: 'failed',
				error: 'No write access',
			}),
		);
		await h.inbox.actions.remove('cards');
		await h.inbox.actions.retry(id);
		await vi.waitFor(() => expect(h.requests).toHaveLength(2));
		expect(h.requests[1]?.run.id).toBe(id);
		expect(h.requests[1]?.run.attemptId).not.toBe(h.requests[0]?.run.attemptId);
		expect(h.requests[1]?.run.action).toEqual(h.requests[0]?.run.action);
		h.gates.get(id)!.reject(new Error('Still unavailable'));
		await vi.waitFor(() =>
			expect(h.inbox.state.get().actionRuns[0]?.state.kind).toBe('failed'),
		);
		await h.inbox.actions.dismiss(id);
		expect(h.inbox.state.get().actionRuns).toEqual([]);
		await h.inbox.dispose();
	});

	it('persists before executing, resumes queued runs, and requires retry for interrupted ones', async () => {
		const h = await setup();
		h.save.mockRejectedValueOnce(new Error('Disk full'));
		await expect(h.inbox.actions.start(h.question, 'cards')).rejects.toThrow(
			'Disk full',
		);
		expect(h.runAction).not.toHaveBeenCalled();
		await h.inbox.retrySave();
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		await h.inbox.actions.save({
			id: 'other',
			name: 'Other',
			prompt: 'Other prompt',
		});
		await h.inbox.actions.start(h.question, 'other');
		const restoredRequests: ActionRequest[] = [];
		await h.inbox.dispose();
		const restored = await InboxController.create({
			defaults,
			persistence: h.disk,
			run: vi.fn(),
			runAction: async (request) => {
				restoredRequests.push(request);
				return 'Completed queued action';
			},
		});
		await vi.waitFor(() => expect(restoredRequests).toHaveLength(1));
		expect(restoredRequests[0]?.run.action.id).toBe('other');
		expect(
			restored.state.get().actionRuns.find((run) => run.action.id === 'cards')
				?.state.kind,
		).toBe('failed');
		await restored.dispose();
		h.gates.get(h.requests[0]!.run.id)!.resolve('late');
	});

	it('recovers a failed completion save without rerunning successful work', async () => {
		const h = await setup();
		const id = await h.inbox.actions.start(h.question, 'cards');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		h.save.mockImplementationOnce(async () => {
			throw new Error('Completion checkpoint failed');
		});
		h.gates.get(id)!.resolve('Written');
		await vi.waitFor(() =>
			expect(h.inbox.state.get().actionRuns[0]?.state.kind).toBe('succeeded'),
		);
		await vi.waitFor(() =>
			expect(h.inbox.state.get().storageError).toContain(
				'Completion checkpoint failed',
			),
		);
		await h.inbox.retrySave();
		expect(h.inbox.state.get().actionRuns).toEqual([]);
		expect((await h.disk.load()).value?.actionRuns).toEqual([]);
		await h.inbox.dispose();
		const restored = await InboxController.create({
			defaults,
			persistence: h.disk,
			run: vi.fn(),
			runAction: h.runAction,
		});
		expect(restored.state.get().actionRuns).toEqual([]);
		expect(h.runAction).toHaveBeenCalledOnce();
		await restored.dispose();
	});

	it('migrates v1 data and rejects duplicate pairs and missing questions', async () => {
		const h = await setup();
		const { questions, preferences } = h.inbox.state.get();
		const migrated = inboxCodec.decode({
			version: 1,
			data: {
				questions: questions.map(
					({ answerInstructions: _instructions, ...question }) => ({
						...question,
						terse: true,
					}),
				),
				preferences: { ...preferences, terse: true },
			},
		});
		expect(migrated.ok && migrated.value.actions).toEqual([]);
		const id = await h.inbox.actions.start(h.question, 'cards');
		const data = structuredClone(h.inbox.state.get());
		data.actionRuns.push({ ...data.actionRuns[0]!, id: 'duplicate' });
		expect(inboxCodec.decode(inboxCodec.encode(data)).ok).toBe(false);
		data.actionRuns.pop();
		data.questions = [];
		expect(inboxCodec.decode(inboxCodec.encode(data)).ok).toBe(false);
		await h.inbox.dispose();
		h.gates.get(id)?.resolve('late');
	});
});
