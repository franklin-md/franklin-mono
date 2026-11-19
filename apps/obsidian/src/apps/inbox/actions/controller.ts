import type { Store } from '@franklin/agent';
import { branchContext } from '../hierarchy/context.js';
import { failedState } from '../controller/failed-state.js';
import type {
	InboxControllerOptions,
	InboxSnapshot,
} from '../controller/types.js';
import { presetListSchema } from '../../../shared/preset/list-schema.js';
import { inboxActionSchema } from './schema.js';
import type { InboxAction } from './types.js';

type Options = {
	store: Store<InboxSnapshot>;
	assertOpen: () => void;
	persist: () => Promise<void>;
	pump: () => void;
	run: InboxControllerOptions['runAction'];
	onComplete: InboxControllerOptions['onActionComplete'];
};

const actionList = presetListSchema(inboxActionSchema);

export class InboxActions {
	constructor(private readonly options: Options) {}

	// Applies a settings change to the latest saved definitions.
	async update(
		change: (current: InboxAction[]) => InboxAction[],
	): Promise<void> {
		const { store, assertOpen } = this.options;
		assertOpen();
		const actions = actionList.parse(change(store.get().actions));
		// Already queued runs retain their definition and can still be retried.
		store.set((draft) => {
			draft.actions = actions;
		});
		await this.options.persist();
	}

	async start(questionId: string, actionId: string): Promise<string> {
		const { store, assertOpen, persist, pump } = this.options;
		assertOpen();
		const snapshot = store.get();
		const existing = snapshot.actionRuns.find(
			(run) => run.question.id === questionId && run.action.id === actionId,
		);
		if (existing) return existing.id;
		const question = snapshot.questions.find((item) => item.id === questionId);
		const action = snapshot.actions.find((item) => item.id === actionId);
		if (question?.state.kind !== 'answered')
			throw new Error('Run actions on an answered question');
		if (!action) throw new Error('Action no longer exists');
		const id = crypto.randomUUID();
		const { provider, model, reasoning } = snapshot.preferences;
		// Reserve the pair synchronously, before persistence or model work can yield.
		store.set((draft) => {
			draft.actionRuns.push({
				id,
				attemptId: crypto.randomUUID(),
				action: structuredClone(action),
				question: structuredClone(question),
				...structuredClone(branchContext(question, snapshot)),
				provider,
				model,
				reasoning,
				createdAt: Date.now(),
				state: { kind: 'queued' },
			});
		});
		await persist();
		pump();
		return id;
	}

	async retry(id: string): Promise<void> {
		this.options.assertOpen();
		this.options.store.set((draft) => {
			const run = draft.actionRuns.find((item) => item.id === id);
			if (run?.state.kind === 'failed') {
				run.attemptId = crypto.randomUUID();
				run.state = { kind: 'queued' };
			}
		});
		await this.options.persist();
		this.options.pump();
	}

	async dismiss(id: string): Promise<void> {
		this.options.assertOpen();
		const run = this.options.store
			.get()
			.actionRuns.find((item) => item.id === id);
		if (run?.state.kind !== 'failed') return;
		this.options.store.set((draft) => {
			draft.actionRuns = draft.actionRuns.filter((item) => item.id !== id);
		});
		await this.options.persist();
	}

	async execute(
		id: string,
		attemptId: string,
		signal: AbortSignal,
	): Promise<void> {
		const { store, persist } = this.options;
		const current = () =>
			store
				.get()
				.actionRuns.find((run) => run.id === id && run.attemptId === attemptId);
		try {
			store.set((draft) => {
				const run = draft.actionRuns.find((item) => item.id === id);
				if (run) run.state = { kind: 'running' };
			});
			await persist();
			const run = current();
			if (!run || signal.aborted) return;
			if (!this.options.run) throw new Error('Action execution is unavailable');
			const summary = (await this.options.run({ run, signal })).trim();
			signal.throwIfAborted();
			if (!current()) return;
			if (!summary)
				throw new Error('The action finished without a completion result');
			store.set((draft) => {
				const item = draft.actionRuns.find((item) => item.id === id);
				if (item) item.state = { kind: 'succeeded', summary };
			});
			// Save completion before cleanup: a crash or failed removal must never
			// restore successful effectful work as a queued request.
			await persist();
			store.set((draft) => {
				draft.actionRuns = draft.actionRuns.filter((item) => item.id !== id);
			});
			await persist();
			this.options.onComplete?.(run.action.name, summary);
		} catch (error) {
			if (signal.aborted) return;
			// A completion/cleanup write failure retains storageError. Retry save
			// finishes cleanup; never turn successful effects into retryable work.
			if (!current() || current()?.state.kind === 'succeeded') return;
			store.set((draft) => {
				const run = draft.actionRuns.find(
					(item) => item.id === id && item.attemptId === attemptId,
				);
				if (run?.state.kind === 'running') run.state = failedState(error);
			});
			await persist().catch(() => {});
		}
	}

	async cleanup(): Promise<void> {
		const completed = this.options.store
			.get()
			.actionRuns.filter((run) => run.state.kind === 'succeeded');
		if (!completed.length) return;
		this.options.store.set((draft) => {
			draft.actionRuns = draft.actionRuns.filter(
				(run) => run.state.kind !== 'succeeded',
			);
		});
		await this.options.persist();
	}
}
