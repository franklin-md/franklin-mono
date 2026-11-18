import { createStore } from '@franklin/agent';
import type { ReadonlyStore, Store } from '@franklin/agent';
import type { QuestionSource } from '../types.js';
import { answerDetailSchema } from '../answer/schema.js';
import { createQuestion } from './create-question.js';
import { errorMessage } from './error.js';
import { interruptedState } from './interrupted.js';
import { branchContext } from '../hierarchy/context.js';
import { InboxGroups } from '../hierarchy/controller.js';
import { inboxNodes } from '../hierarchy/nodes.js';
import { nextNodeOrder } from '../hierarchy/order.js';
import { childParent } from '../hierarchy/parent.js';
import type { NewChild } from '../hierarchy/types.js';
import { ThoughtDumps } from '../modes/controller.js';
import { restoreInbox } from './restore.js';
import type {
	InboxControllerOptions,
	InboxPreferences,
	InboxSnapshot,
} from './types.js';

type AddOptions = { id?: string; parentId?: string; source?: QuestionSource };

export class InboxController {
	readonly state: ReadonlyStore<InboxSnapshot>;
	readonly groups: InboxGroups;
	readonly thoughtDumps: ThoughtDumps;
	private readonly store: Store<InboxSnapshot>;
	private readonly active = new Map<string, AbortController>();
	private writes = Promise.resolve();
	private closed = false;

	private constructor(
		private readonly options: InboxControllerOptions,
		initial: InboxSnapshot,
	) {
		this.store = createStore(initial);
		this.state = this.store;
		const operations = {
			store: this.store,
			assertOpen: () => this.assertOpen(),
			persist: () => this.persist(),
			pump: () => this.pump(),
		};
		this.groups = new InboxGroups(operations);
		this.thoughtDumps = new ThoughtDumps({
			...operations,
			split: options.split,
		});
	}

	static async create(
		options: InboxControllerOptions,
		signal?: AbortSignal,
	): Promise<InboxController> {
		signal?.throwIfAborted();
		const initial = await restoreInbox(options);
		signal?.throwIfAborted();
		const controller = new InboxController(options, initial);
		await controller.persist();
		signal?.throwIfAborted();
		controller.pump();
		return controller;
	}

	async add(
		input: string,
		{ id = crypto.randomUUID(), parentId, source }: AddOptions = {},
	): Promise<string> {
		this.assertOpen();
		const text = input.trim();
		if (!text) throw new Error('Enter a question');
		if (!id.trim()) throw new Error('Question ID must not be empty');
		const snapshot = this.store.get();
		const existing = snapshot.questions.find((question) => question.id === id);
		// Retry save may have accepted this question before the draft is resent.
		if (existing) {
			if (existing.text !== text || existing.parentId !== parentId)
				throw new Error(
					'Question ID already belongs to a different submission',
				);
		} else {
			const parent = childParent(snapshot, parentId);
			const question = createQuestion({
				id,
				text,
				preferences: snapshot.preferences,
				source,
				parent,
			});
			question.order = nextNodeOrder(snapshot);
			this.store.set((draft) => {
				draft.questions.unshift(question);
			});
		}
		await this.persist();
		this.pump();
		return id;
	}

	async addChild(parentId: string, input: NewChild): Promise<string> {
		return input.kind === 'group'
			? this.groups.add(input, parentId)
			: this.add(input.text, { parentId, source: input.source });
	}

	async configure(patch: Partial<InboxPreferences>): Promise<void> {
		this.assertOpen();
		if (
			patch.concurrency !== undefined &&
			(!Number.isInteger(patch.concurrency) ||
				patch.concurrency < 1 ||
				patch.concurrency > 4)
		)
			throw new Error('Choose between 1 and 4 concurrent questions');
		this.store.set((draft) => {
			Object.assign(draft.preferences, patch);
		});
		await this.persist();
		this.pump();
	}

	async retry(id: string): Promise<void> {
		this.assertOpen();
		const current = this.store
			.get()
			.questions.find((question) => question.id === id);
		if (current?.state.kind !== 'failed') return;
		this.store.set((draft) => {
			const question = draft.questions.find((question) => question.id === id);
			if (question) {
				question.state = { kind: 'queued' };
				question.attemptId = crypto.randomUUID();
				question.updatedAt = Date.now();
			}
		});
		await this.persist();
		this.pump();
	}

	async remove(id: string): Promise<void> {
		this.assertOpen();
		const deleted = new Set([id]);
		let count: number;
		do {
			count = deleted.size;
			for (const node of inboxNodes(this.store.get())) {
				if (node.parentId && deleted.has(node.parentId)) deleted.add(node.id);
			}
		} while (count !== deleted.size);
		this.store.set((draft) => {
			draft.questions = draft.questions.filter(
				(question) => !deleted.has(question.id),
			);
			draft.groups = draft.groups?.filter((group) => !deleted.has(group.id));
			draft.thoughtDumps = draft.thoughtDumps?.filter(
				(dump) => !dump.groupId || !deleted.has(dump.groupId),
			);
		});
		for (const key of deleted) this.active.get(key)?.abort();
		await this.persist();
		this.pump();
	}

	async retrySave(): Promise<void> {
		this.assertOpen();
		await this.persist();
		this.pump();
	}

	async dispose(): Promise<void> {
		this.closed = true;
		for (const abort of this.active.values()) abort.abort();
		this.store.set((draft) => {
			for (const question of draft.questions) {
				if (question.state.kind === 'running')
					question.state = interruptedState();
			}
			for (const dump of draft.thoughtDumps ?? []) {
				if (dump.state.kind === 'running') dump.state = interruptedState();
			}
		});
		// The runner owns cancellation and runtime disposal in its finally block.
		await this.persist();
	}

	private assertOpen() {
		if (this.closed) throw new Error('Inbox is closed');
	}

	private async persist(): Promise<void> {
		const { questions, preferences, groups, thoughtDumps } = this.store.get();
		const document = { questions, preferences, groups, thoughtDumps };
		const write = this.writes.then(() =>
			this.options.persistence.save(document),
		);
		this.writes = write.catch(() => {});
		try {
			await write;
			this.store.set((draft) => {
				delete draft.storageError;
			});
		} catch (error) {
			this.store.set((draft) => {
				draft.storageError = `Inbox could not be saved: ${errorMessage(error)}`;
			});
			throw error;
		}
	}

	private pump(): void {
		if (this.closed || this.store.get().storageError) return;
		const { questions, thoughtDumps, preferences } = this.store.get();
		const queue = [
			...[...questions]
				.reverse()
				.map((question) => ({ ...question, type: 'question' as const })),
			...[...(thoughtDumps ?? [])]
				.reverse()
				.map((dump) => ({ ...dump, type: 'dump' as const })),
		].sort((a, b) => a.createdAt - b.createdAt);
		for (const item of queue) {
			if (this.active.size >= preferences.concurrency) break;
			if (item.state.kind !== 'queued' || this.active.has(item.id)) continue;
			const abort = new AbortController();
			// Reserve the slot synchronously and hold it until the runner settles.
			this.active.set(item.id, abort);
			const running =
				item.type === 'dump'
					? this.thoughtDumps.execute(item.id, abort.signal)
					: this.execute(item.id, item.attemptId, abort.signal);
			void running.finally(() => {
				this.active.delete(item.id);
				this.pump();
			});
		}
	}

	private async execute(
		id: string,
		attemptId: string,
		signal: AbortSignal,
	): Promise<void> {
		try {
			this.store.set((draft) => {
				const question = draft.questions.find((question) => question.id === id);
				if (question) question.state = { kind: 'running' };
			});
			await this.persist();
			const snapshot = this.store.get();
			const question = snapshot.questions.find(
				(question) => question.id === id,
			);
			if (!question || signal.aborted || this.closed) return;
			await this.options.run({
				question,
				...branchContext(question, snapshot),
				signal,
				submit: async (answer, title, details) => {
					const current = this.store
						.get()
						.questions.find((question) => question.id === id);
					if (
						signal.aborted ||
						this.closed ||
						current?.attemptId !== attemptId ||
						current.state.kind !== 'running'
					)
						throw new Error('Question attempt is no longer accepting answers');
					if (!answer.trim()) throw new Error('Answer must not be empty');
					const sections = details?.map((detail) =>
						answerDetailSchema.parse(detail),
					);
					this.store.set((draft) => {
						const question = draft.questions.find(
							(question) => question.id === id,
						);
						if (question) {
							question.state = {
								kind: 'answered',
								answer: answer.trim(),
								...(title?.trim() ? { title: title.trim() } : {}),
								...(sections ? { details: sections } : {}),
							};
							question.updatedAt = Date.now();
						}
					});
					await this.persist();
				},
			});
			const current = this.store
				.get()
				.questions.find((question) => question.id === id);
			if (current?.attemptId === attemptId && current.state.kind === 'running')
				throw new Error(
					'The agent finished without submitting an answer. Retry the question.',
				);
		} catch (error) {
			if (this.closed) return;
			this.store.set((draft) => {
				const question = draft.questions.find((question) => question.id === id);
				if (
					question?.attemptId === attemptId &&
					question.state.kind === 'running'
				) {
					question.state = { kind: 'failed', error: errorMessage(error) };
					question.updatedAt = Date.now();
				}
			});
			await this.persist().catch(() => {});
		}
	}
}
