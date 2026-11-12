import { ThoughtDumps } from '../modes/controller.js';
import { createQuestion } from './create-question.js';
import { interruptedState } from './interrupted.js';
import { createStore } from '@franklin/agent';
import type { ReadonlyStore, Store } from '@franklin/agent';
import type { QuestionSource } from '../types.js';
import { restoreInbox } from './restore.js';
import { branchContext } from '../hierarchy/context.js';
import { InboxGroups } from '../hierarchy/controller.js';
import { childParent } from '../hierarchy/parent.js';
import { inboxNodes } from '../hierarchy/nodes.js';
import { nextNodeOrder } from '../hierarchy/order.js';
import type { NewChild } from '../hierarchy/types.js';
import { errorMessage } from './error.js';
import { QuestionSaveError } from './save-error.js';
import { InboxActions } from '../actions/controller.js';
import { answerDetailSchema } from '../answer/schema.js';
import { createDebugDump } from '../debug/dump.js';
import type {
	InboxControllerOptions,
	InboxDocument,
	InboxPreferences,
	InboxSnapshot,
} from './types.js';

export class InboxController {
	readonly state: ReadonlyStore<InboxSnapshot>;
	readonly actions: InboxActions;
	readonly thoughtDumps: ThoughtDumps;
	readonly groups: InboxGroups;
	get capture() {
		return this.options.capture;
	}
	private readonly store: Store<InboxSnapshot>;
	private readonly active = new Map<string, AbortController>();
	private writes = Promise.resolve();
	private saved: InboxDocument;
	private readonly savedListeners = new Set<
		(document: InboxDocument) => void
	>();
	private closed = false;

	private constructor(
		private readonly options: InboxControllerOptions,
		initial: InboxDocument,
	) {
		this.saved = initial;
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
		this.actions = new InboxActions({
			...operations,
			run: options.runAction,
			onComplete: options.onActionComplete,
		});
	}

	static async create(
		options: InboxControllerOptions,
	): Promise<InboxController> {
		const initial = await restoreInbox(options);
		const controller = new InboxController(options, initial);
		await controller.persist();
		controller.pump();
		return controller;
	}

	// Consumers that edit notes must observe committed snapshots. state also contains
	// optimistic changes, including deletions that can still fail to reach disk.
	subscribeSaved(listener: (document: InboxDocument) => void): () => void {
		this.savedListeners.add(listener);
		listener(this.saved);
		return () => this.savedListeners.delete(listener);
	}

	async add(
		text: string,
		parentId?: string,
		source?: QuestionSource,
	): Promise<string> {
		this.assertOpen();
		if (!text.trim()) throw new Error('Enter a question');
		const { preferences } = this.store.get();
		const parent = childParent(this.store.get(), parentId);
		const question = createQuestion({ text, preferences, source, parent });
		question.order = nextNodeOrder(this.store.get());
		const id = question.id;
		this.store.set((draft) => {
			draft.questions.unshift(question);
		});
		try {
			await this.persist();
		} catch (error) {
			// Retain the optimistic question's identity so capture can retry its save
			// and attach the pill without queueing a second question.
			throw new QuestionSaveError(id, error);
		}
		this.pump();
		return id;
	}

	async addChild(parentId: string, input: NewChild): Promise<string> {
		return input.kind === 'group'
			? this.groups.add(input, parentId)
			: this.add(input.text, parentId, input.source);
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

	async debug(id: string): Promise<string> {
		const questions = this.store.get().questions;
		const question = questions.find((item) => item.id === id);
		if (!question) throw new Error('Question is no longer in the inbox');
		const { ancestors, groups } = branchContext(question, this.store.get());
		return createDebugDump(question, ancestors, this.options.evidence, groups);
	}

	async retry(id: string): Promise<void> {
		this.assertOpen();
		const current = this.store.get().questions.find((q) => q.id === id);
		if (current?.state.kind !== 'failed') return;
		this.store.set((draft) => {
			const question = draft.questions.find((q) => q.id === id);
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
			for (const q of inboxNodes(this.store.get())) {
				if (q.parentId && deleted.has(q.parentId)) deleted.add(q.id);
			}
		} while (count !== deleted.size);
		const actionIds = this.store
			.get()
			.actionRuns.filter((run) => deleted.has(run.question.id))
			.map((run) => run.id);
		this.store.set((draft) => {
			draft.questions = draft.questions.filter((q) => !deleted.has(q.id));
			draft.groups = draft.groups?.filter((group) => !deleted.has(group.id));
			draft.thoughtDumps = draft.thoughtDumps?.filter(
				(dump) => !dump.groupId || !deleted.has(dump.groupId),
			);
			draft.actionRuns = draft.actionRuns.filter(
				(run) => !deleted.has(run.question.id),
			);
		});
		for (const key of [...deleted, ...actionIds]) this.active.get(key)?.abort();
		await this.persist();
		this.pump();
	}

	async retrySave(): Promise<void> {
		this.assertOpen();
		await this.persist();
		await this.actions.cleanup();
		this.pump();
	}

	async dispose(): Promise<void> {
		this.closed = true;
		for (const abort of this.active.values()) abort.abort();
		this.store.set((draft) => {
			for (const q of draft.questions) {
				if (q.state.kind === 'running') q.state = interruptedState();
			}
			for (const dump of draft.thoughtDumps ?? []) {
				if (dump.state.kind === 'running') dump.state = interruptedState();
			}
			for (const run of draft.actionRuns) {
				if (run.state.kind === 'running') run.state = interruptedState();
			}
		});
		await this.persist();
		// Runtime cancellation/disposal happens in the runner's finally. The plugin
		// need not keep a pane mounted to own an active question.
		await this.options.capture?.dispose();
	}

	private assertOpen() {
		if (this.closed) throw new Error('Inbox is closed');
	}

	private async persist(): Promise<void> {
		const {
			questions,
			preferences,
			actions,
			actionRuns,
			thoughtDumps,
			groups,
		} = this.store.get();
		const document = {
			questions,
			preferences,
			actions,
			actionRuns,
			thoughtDumps,
			groups,
		};
		const write = this.writes.then(async () => {
			await this.options.persistence.save(document);
			this.saved = document;
			for (const listener of this.savedListeners) listener(document);
		});
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
		const { questions, actionRuns, thoughtDumps } = this.store.get();
		const queue = [
			...[...questions]
				.reverse()
				.map((question) => ({ ...question, type: 'question' as const })),
			...actionRuns.map((run) => ({ ...run, type: 'action' as const })),
			...(thoughtDumps ?? []).map((dump) => ({
				...dump,
				type: 'dump' as const,
			})),
		].sort((a, b) => a.createdAt - b.createdAt);
		for (const item of queue) {
			if (this.active.size >= this.store.get().preferences.concurrency) break;
			if (item.state.kind !== 'queued' || this.active.has(item.id)) continue;
			const abort = new AbortController();
			// Reserve the slot before the first await; submission does not release it.
			this.active.set(item.id, abort);
			const execute =
				item.type === 'dump'
					? this.thoughtDumps.execute(item.id, abort.signal)
					: item.type === 'action'
						? this.actions.execute(item.id, item.attemptId, abort.signal)
						: this.execute(item.id, item.attemptId, abort.signal);
			void execute.finally(() => {
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
				const q = draft.questions.find((item) => item.id === id);
				if (q) q.state = { kind: 'running' };
			});
			await this.persist();
			const question = this.store
				.get()
				.questions.find((item) => item.id === id);
			if (!question || signal.aborted || this.closed) return;
			await this.options.run({
				question,
				...branchContext(question, this.store.get()),
				signal,
				submit: async (answer, title, details) => {
					const current = this.store
						.get()
						.questions.find((item) => item.id === id);
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
						const q = draft.questions.find((item) => item.id === id);
						if (q) {
							q.state = {
								kind: 'answered',
								answer: answer.trim(),
								...(title?.trim() ? { title: title.trim() } : {}),
								...(sections ? { details: sections } : {}),
							};
							q.updatedAt = Date.now();
						}
					});
					await this.persist();
				},
			});
			const current = this.store.get().questions.find((item) => item.id === id);
			if (current?.attemptId === attemptId && current.state.kind === 'running')
				throw new Error(
					'The agent finished without submitting an answer. Retry the question.',
				);
		} catch (error) {
			if (this.closed) return;
			this.store.set((draft) => {
				const q = draft.questions.find((item) => item.id === id);
				if (q?.attemptId === attemptId && q.state.kind === 'running') {
					q.state = { kind: 'failed', error: errorMessage(error) };
					q.updatedAt = Date.now();
				}
			});
			await this.persist().catch(() => {});
		}
	}
}
