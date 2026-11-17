import { createStore } from '@franklin/agent';
import type { ReadonlyStore, Store } from '@franklin/agent';
import type { QuestionSource } from '../types.js';
import { answerDetailSchema } from '../answer/schema.js';
import { createQuestion } from './create-question.js';
import { errorMessage } from './error.js';
import { interruptedState } from './interrupted.js';
import { ancestorsOf } from './lineage.js';
import { restoreInbox } from './restore.js';
import type {
	InboxControllerOptions,
	InboxPreferences,
	InboxSnapshot,
} from './types.js';

export class InboxController {
	readonly state: ReadonlyStore<InboxSnapshot>;
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
	}

	static async create(
		options: InboxControllerOptions,
	): Promise<InboxController> {
		const controller = new InboxController(
			options,
			await restoreInbox(options),
		);
		await controller.persist();
		controller.pump();
		return controller;
	}

	async add(
		text: string,
		parentId?: string,
		source?: QuestionSource,
	): Promise<string> {
		this.assertOpen();
		if (!text.trim()) throw new Error('Enter a question');
		const { questions, preferences } = this.store.get();
		const parent = questions.find((question) => question.id === parentId);
		if (parentId && parent?.state.kind !== 'answered')
			throw new Error('Follow-ups need an answered parent question');
		const question = createQuestion({ text, preferences, source, parent });
		this.store.set((draft) => {
			draft.questions.unshift(question);
		});
		await this.persist();
		this.pump();
		return question.id;
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
			for (const question of this.store.get().questions) {
				if (question.parentId && deleted.has(question.parentId))
					deleted.add(question.id);
			}
		} while (count !== deleted.size);
		this.store.set((draft) => {
			draft.questions = draft.questions.filter(
				(question) => !deleted.has(question.id),
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
		});
		// The runner owns cancellation and runtime disposal in its finally block.
		await this.persist();
	}

	private assertOpen() {
		if (this.closed) throw new Error('Inbox is closed');
	}

	private async persist(): Promise<void> {
		const { questions, preferences } = this.store.get();
		const document = { questions, preferences };
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
		const queue = [...this.store.get().questions]
			.reverse()
			.sort((a, b) => a.createdAt - b.createdAt);
		for (const question of queue) {
			if (this.active.size >= this.store.get().preferences.concurrency) break;
			if (question.state.kind !== 'queued' || this.active.has(question.id))
				continue;
			const abort = new AbortController();
			// Reserve the slot synchronously and hold it until the runner settles,
			// even when its answer was submitted before its final turn ended.
			this.active.set(question.id, abort);
			void this.execute(question.id, question.attemptId, abort.signal).finally(
				() => {
					this.active.delete(question.id);
					this.pump();
				},
			);
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
			const { questions } = this.store.get();
			const question = questions.find((question) => question.id === id);
			if (!question || signal.aborted || this.closed) return;
			await this.options.run({
				question,
				ancestors: ancestorsOf(question, questions),
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
