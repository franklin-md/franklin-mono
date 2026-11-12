import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { afterEach, expect, it, vi } from 'vitest';
import { InboxController } from '../../controller/controller.js';
import { inboxCodec } from '../../controller/schema.js';
import type { AnswerRequest } from '../../controller/types.js';
import { questionPrompt } from '../../agent/prompt.js';

const controllers: InboxController[] = [];
afterEach(async () => {
	await Promise.all(controllers.splice(0).map((c) => c.dispose()));
	vi.restoreAllMocks();
});

async function setup() {
	const requests: AnswerRequest[] = [];
	const persistence = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/inbox.json'),
		inboxCodec,
	);
	const options = {
		persistence,
		defaults: { provider: 'test', model: 'test', reasoning: 'off' as const },
		run: async (request: AnswerRequest) => {
			requests.push(request);
			await request.submit(`Answer: ${request.question.text}`);
		},
	};
	const inbox = await InboxController.create(options);
	controllers.push(inbox);
	return { inbox, requests, options, persistence };
}

it('creates nested groups and questions, keeps sibling answers out of context, and restores folds', async () => {
	const h = await setup();
	const source = { note: 'VM', heading: 'Paging', quote: 'pages' };
	const group = await h.inbox.groups.add({
		title: 'Virtual memory',
		context: 'Explore virtual memory on RISC-V.',
		source,
	});
	const one = await h.inbox.addChild(group, {
		kind: 'question',
		text: 'Why pages?',
	});
	const two = await h.inbox.add('How big?', group);
	await vi.waitFor(() => expect(h.requests).toHaveLength(2));
	const oneRequest = h.requests.find((r) => r.question.id === one)!;
	expect(oneRequest.ancestors).toEqual([]);
	expect(oneRequest.groups?.map((g) => g.id)).toEqual([group]);
	expect(oneRequest.question.source).toEqual(source);
	expect(oneRequest.question.rootId).toBe(group);
	expect(questionPrompt(oneRequest)).toContain(
		'Explore virtual memory on RISC-V.',
	);
	expect(questionPrompt(oneRequest)).not.toContain('Answer: How big?');
	const nested = await h.inbox.addChild(one, {
		kind: 'group',
		title: 'Details',
		context: 'Focus on address spaces.',
	});
	const child = await h.inbox.addChild(nested, {
		kind: 'question',
		text: 'Per process?',
	});
	await vi.waitFor(() => expect(h.requests).toHaveLength(3));
	const followUp = h.requests.find((r) => r.question.id === child)!;
	expect(followUp.ancestors.map((q) => q.id)).toEqual([one]);
	expect(followUp.groups?.map((g) => g.id)).toEqual([group, nested]);
	expect(questionPrompt(followUp)).toContain('Answer: Why pages?');
	expect(questionPrompt(followUp)).not.toContain('Answer: How big?');
	await h.inbox.actions.save({
		id: 'action',
		name: 'Inspect',
		prompt: 'Inspect this answer.',
	});
	await h.inbox.actions.start(child, 'action');
	await vi.waitFor(() =>
		expect(h.inbox.state.get().actionRuns[0]?.state.kind).toBe('failed'),
	);
	expect(h.inbox.state.get().actionRuns[0]?.groups?.map((g) => g.id)).toEqual([
		group,
		nested,
	]);
	expect(JSON.parse(await h.inbox.debug(child))).toMatchObject({
		groups: [{ id: group }, { id: nested }],
	});
	await h.inbox.groups.fold(group, true);
	const restored = await InboxController.create(h.options);
	controllers.push(restored);
	expect(restored.state.get().groups?.find((g) => g.id === group)?.folded).toBe(
		true,
	);
	await restored.remove(one);
	expect(restored.state.get().groups?.map((g) => g.id)).toEqual([group]);
	expect(restored.state.get().questions.map((q) => q.id)).toEqual([two]);
	await restored.remove(group);
	expect(restored.state.get().questions).toEqual([]);
	expect(restored.state.get().groups).toEqual([]);
});

it('rejects missing parents and unanswered question parents before creating children', async () => {
	const h = await setup();
	await expect(h.inbox.groups.add({}, 'missing')).rejects.toThrow(/parent/i);
	await expect(h.inbox.add('orphan', 'missing')).rejects.toThrow();
	expect(h.inbox.state.get().questions).toEqual([]);
	const queuedOptions = { ...h.options, run: vi.fn(async () => {}) };
	const queued = await InboxController.create(queuedOptions);
	controllers.push(queued);
	const question = await queued.add('Unanswered');
	await expect(
		queued.addChild(question, { kind: 'question', text: 'Too soon' }),
	).rejects.toThrow(/answered/);
	await expect(queued.addChild(question, { kind: 'group' })).rejects.toThrow(
		/answered/,
	);
});

it('migrates v5 without rewriting question branches and rejects invalid mixed hierarchies', async () => {
	const h = await setup();
	const rootQuestion = await h.inbox.add('Original question');
	await vi.waitFor(() => expect(h.requests).toHaveLength(1));
	await h.inbox.add('Original follow-up', rootQuestion);
	const group = await h.inbox.groups.add({});
	const child = await h.inbox.groups.add({}, group);
	await h.inbox.add('Question', child);
	const document = (await h.persistence.load()).value!;
	expect(inboxCodec.encode(document)).toMatchObject({ version: 6 });
	const old = {
		...document,
		groups: undefined,
		questions: document.questions.filter((q) => q.rootId === rootQuestion),
	};
	const migrated = inboxCodec.decode({ version: 5, data: old });
	expect(migrated.ok && migrated.value.groups).toEqual([]);
	expect(migrated.ok && migrated.value.questions).toEqual(old.questions);
	const cycle = structuredClone(document);
	cycle.groups!.find((g) => g.id === group)!.parentId = child;
	expect(inboxCodec.decode(inboxCodec.encode(cycle)).ok).toBe(false);
	const missing = structuredClone(document);
	missing.groups!.find((g) => g.id === child)!.parentId = 'missing';
	expect(inboxCodec.decode(inboxCodec.encode(missing)).ok).toBe(false);
	const duplicate = structuredClone(document);
	duplicate.groups!.push({ ...duplicate.groups![0]! });
	expect(inboxCodec.decode(inboxCodec.encode(duplicate)).ok).toBe(false);
});

it('orders mixed siblings deterministically even when creation timestamps tie', async () => {
	vi.spyOn(Date, 'now').mockReturnValue(1000);
	const h = await setup();
	const root = await h.inbox.groups.add();
	const first = await h.inbox.add('First', root);
	const middle = await h.inbox.groups.add({}, root);
	const last = await h.inbox.add('Last', root);
	const snapshot = h.inbox.state.get();
	const siblings = [...snapshot.questions, ...snapshot.groups!].filter(
		(node) => node.parentId === root,
	);
	expect(siblings.every((node) => node.createdAt === 1000)).toBe(true);
	expect(
		siblings.sort((a, b) => a.order! - b.order!).map((node) => node.id),
	).toEqual([first, middle, last]);
});

it('resumes queued work when folding successfully saves after an earlier storage failure', async () => {
	const h = await setup();
	const group = await h.inbox.groups.add();
	vi.spyOn(h.persistence, 'save').mockRejectedValueOnce(new Error('Disk full'));
	await expect(h.inbox.add('Waiting for storage')).rejects.toThrow('Disk full');
	expect(h.requests).toHaveLength(0);
	await h.inbox.groups.fold(group, true);
	await vi.waitFor(() => expect(h.requests).toHaveLength(1));
	expect(h.inbox.state.get().storageError).toBeUndefined();
});

it('keeps running work alive while folded and cancels all question descendants on group deletion', async () => {
	const h = await setup();
	const requests: AnswerRequest[] = [];
	const inbox = await InboxController.create({
		...h.options,
		run: async (request) => {
			requests.push(request);
			await new Promise<void>((resolve) =>
				request.signal.addEventListener('abort', () => resolve(), {
					once: true,
				}),
			);
		},
	});
	controllers.push(inbox);
	const group = await inbox.groups.add();
	await inbox.add('Running', group);
	await vi.waitFor(() => expect(requests).toHaveLength(1));
	await inbox.groups.fold(group, true);
	expect(requests[0]?.signal.aborted).toBe(false);
	expect(inbox.state.get().questions[0]?.state.kind).toBe('running');
	await inbox.remove(group);
	expect(requests[0]?.signal.aborted).toBe(true);
	expect(inbox.state.get().questions).toEqual([]);
});
