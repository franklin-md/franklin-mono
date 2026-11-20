import { describe, expect, it, vi } from 'vitest';
import { InboxController } from '../controller/index.js';
import { inboxCodec, settingsDocumentCodec } from '../controller/schema.js';
import type { ActionRequest, InboxAction } from '../actions/types.js';
import { testAction, upsertAction } from '../testing/action.js';
import { createInboxCodecPersistence } from '../testing/persistence.js';

const defaults = {
	provider: 'test',
	model: 'model',
	reasoning: 'low' as const,
};

function updateActions(
	inbox: InboxController,
	change: (actions: InboxAction[]) => InboxAction[],
) {
	return inbox.settings.configure((current) => ({
		actions: change(current.actions),
	}));
}

async function setup(concurrency = 1) {
	const disk = createInboxCodecPersistence();
	const save = vi.spyOn(disk.inbox, 'save');
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
	await inbox.settings.configure({ concurrency });
	await updateActions(
		inbox,
		upsertAction(
			testAction(
				'cards',
				'🃏',
				'Read [[Workflow Guide]] and create proposals.',
			),
		),
	);
	const question = await inbox.add('Why recheck?', {
		source: { note: 'Sleep', heading: 'Waking', quote: 'Check again' },
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
		await updateActions(
			h.inbox,
			upsertAction(testAction('cards', 'Cards', 'Changed prompt')),
		);
		await h.inbox.settings.configure({ model: 'changed-model' });
		expect(run.action.name).toBe('🃏');
		expect(run.model).toBe('model');
		h.gates.get(run.id)!.resolve('Added 2 proposals');
		await vi.waitFor(() =>
			expect(h.complete).toHaveBeenCalledWith('🃏', 'Added 2 proposals'),
		);
		expect((await h.disk.inbox.load()).value?.actionRuns).toEqual([]);
		expect(h.inbox.state.get().questions).toHaveLength(1);
		expect(h.inbox.settings.get().actions[0]?.name).toBe('Cards');
		const next = await h.inbox.actions.start(h.question, 'cards');
		expect(next).not.toBe(run.id);
		await vi.waitFor(() => expect(h.requests).toHaveLength(2));
		expect(h.requests[1]?.run.action.prompt).toBe('Changed prompt');
		await h.inbox.dispose();
		h.gates.get(next)!.resolve('late');
	});

	it('shares question slots, keeps separate pairs independent, and carries only the selected branch', async () => {
		const h = await setup();
		const child = await h.inbox.add('Child question', { parentId: h.question });
		await vi.waitFor(() =>
			expect(h.inbox.state.get().questions[0]?.state.kind).toBe('answered'),
		);
		await updateActions(
			h.inbox,
			upsertAction(testAction('other', 'Notes', 'Save a note')),
		);
		const first = await h.inbox.actions.start(child, 'cards');
		await h.inbox.actions.start(h.question, 'cards');
		await h.inbox.actions.start(child, 'other');
		await h.inbox.add('Queued behind action');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		expect(h.requests[0]?.run.ancestors.map((q) => q.id)).toEqual([h.question]);
		expect(h.inbox.state.get().questions[0]?.state.kind).toBe('queued');
		await h.inbox.settings.configure({ concurrency: 3 });
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
		await updateActions(h.inbox, (actions) =>
			actions.filter((action) => action.id !== 'cards'),
		);
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
		await updateActions(
			h.inbox,
			upsertAction(testAction('other', 'Other', 'Other prompt')),
		);
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
		expect((await h.disk.inbox.load()).value?.actionRuns).toEqual([]);
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

	it('migrates v1 data, gives v10 actions an icon and color, moves settings out in v12, and rejects duplicate pairs and missing questions', async () => {
		const h = await setup();
		const { questions } = h.inbox.state.get();
		const { actions, ...preferences } = h.inbox.settings.get();
		const migrated = settingsDocumentCodec.decode({
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
		const work = structuredClone(h.inbox.state.get());
		const data = { ...work, preferences, actions: structuredClone(actions) };
		const withoutIcon = ({
			icon: _icon,
			color: _color,
			...action
		}: InboxAction) => action;
		const withDefaultIcon = (action: InboxAction) => ({
			...action,
			icon: 'lucide-sparkles',
			color: 'blue',
		});
		const legacy = {
			...data,
			actions: data.actions.map(withoutIcon),
			actionRuns: data.actionRuns.map((run) => ({
				...run,
				action: withoutIcon(run.action),
			})),
		};
		for (const version of [8, 10]) {
			const saved = settingsDocumentCodec.decode({ version, data: legacy });
			expect(saved.ok && saved.value.actions).toEqual(
				data.actions.map(withDefaultIcon),
			);
			expect(saved.ok && saved.value.actionRuns).toEqual(
				data.actionRuns.map((run) => ({
					...run,
					action: withDefaultIcon(run.action),
				})),
			);
		}
		const version11 = settingsDocumentCodec.encode(data);
		expect(version11).toMatchObject({ version: 11 });
		expect(settingsDocumentCodec.decode(version11)).toMatchObject({
			ok: true,
			value: { preferences, actions: data.actions },
		});
		const current = inboxCodec.decode(version11);
		expect(current.ok && current.value).toEqual(work);
		expect(inboxCodec.encode(work)).toMatchObject({ version: 12 });
		const { actions: _actions, actionRuns: _runs, ...groupsOnly } = data;
		const groups = settingsDocumentCodec.decode({
			version: 9,
			data: groupsOnly,
		});
		expect(groups.ok && groups.value.actionRuns).toEqual([]);
		work.actionRuns.push({ ...work.actionRuns[0]!, id: 'duplicate' });
		expect(inboxCodec.decode(inboxCodec.encode(work)).ok).toBe(false);
		work.actionRuns.pop();
		work.questions = [];
		expect(inboxCodec.decode(inboxCodec.encode(work)).ok).toBe(false);
		await h.inbox.dispose();
		h.gates.get(id)?.resolve('late');
	});
});
