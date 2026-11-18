import type { Store } from '@franklin/agent';
import type {
	InboxSnapshot,
	InboxControllerOptions,
} from '../controller/types.js';
import type { QuestionSource } from '../types.js';
import { createQuestion } from '../controller/create-question.js';
import { createGroup } from '../hierarchy/create.js';
import { nextNodeOrder } from '../hierarchy/order.js';
import { errorMessage } from '../controller/error.js';
import { parseExtraction } from './parse-extraction.js';

type Options = {
	store: Store<InboxSnapshot>;
	assertOpen: () => void;
	persist: () => Promise<void>;
	pump: () => void;
	split: InboxControllerOptions['split'];
};

export class ThoughtDumps {
	constructor(private readonly options: Options) {}
	async add(
		text: string,
		source?: QuestionSource,
		preferences = this.options.store.get().preferences,
	): Promise<void> {
		const { store, assertOpen, persist, pump } = this.options;
		assertOpen();
		if (!text.trim()) throw new Error('Enter a thought dump');
		if (!this.options.split)
			throw new Error('Question extraction is unavailable');
		const id = crypto.randomUUID();
		store.set((draft) => {
			(draft.thoughtDumps ??= []).unshift({
				id,
				text: text.trim(),
				createdAt: Date.now(),
				provider: preferences.provider,
				model: preferences.model,
				reasoning: preferences.reasoning,
				answerInstructions: preferences.answerInstructions,
				source,
				state: { kind: 'queued' },
			});
		});
		// Keep the composer draft on initial save failure; no job has started yet.
		try {
			await persist();
		} catch (error) {
			store.set((draft) => {
				draft.thoughtDumps = draft.thoughtDumps?.filter(
					(item) => item.id !== id,
				);
			});
			throw error;
		}
		pump();
	}
	async retry(id: string): Promise<void> {
		this.options.assertOpen();
		this.options.store.set((draft) => {
			const dump = draft.thoughtDumps?.find((item) => item.id === id);
			if (dump?.state.kind === 'failed') dump.state = { kind: 'queued' };
		});
		await this.options.persist();
		this.options.pump();
	}
	async dismiss(id: string): Promise<void> {
		this.options.assertOpen();
		this.options.store.set((draft) => {
			draft.thoughtDumps = draft.thoughtDumps?.filter(
				(item) =>
					item.id !== id ||
					item.state.kind === 'running' ||
					item.state.kind === 'queued',
			);
		});
		await this.options.persist();
	}
	async execute(id: string, signal: AbortSignal): Promise<void> {
		const { store, persist, split } = this.options;
		try {
			store.set((draft) => {
				const dump = draft.thoughtDumps?.find((item) => item.id === id);
				if (dump) dump.state = { kind: 'running' };
			});
			await persist();
			const dump = store.get().thoughtDumps?.find((item) => item.id === id);
			if (!dump || signal.aborted) return;
			if (!split) throw new Error('Question extraction is unavailable');
			const { title, questions } = parseExtraction(
				await split({ dump, signal }),
			);
			signal.throwIfAborted();
			// Commit the questions and completion marker together. A failed write can be
			// retried without extracting again or appending a second batch.
			store.set((draft) => {
				const current = draft.thoughtDumps?.find((item) => item.id === id);
				if (current?.state.kind !== 'running') return;
				const group = createGroup({
					title,
					context: dump.text,
					source: dump.source,
				});
				const order = nextNodeOrder(draft);
				group.order = order;
				(draft.groups ??= []).unshift(group);
				draft.questions.unshift(
					...questions.map((text, index) => ({
						...createQuestion({
							text,
							preferences: dump,
							source: dump.source,
							parent: group,
						}),
						order: order + index + 1,
					})),
				);
				current.state = { kind: 'succeeded', count: questions.length };
				current.groupId = group.id;
			});
			await persist();
		} catch (error) {
			if (
				signal.aborted ||
				store.get().thoughtDumps?.find((item) => item.id === id)?.state.kind ===
					'succeeded'
			)
				return;
			store.set((draft) => {
				const dump = draft.thoughtDumps?.find((item) => item.id === id);
				if (dump?.state.kind === 'running')
					dump.state = { kind: 'failed', error: errorMessage(error) };
			});
			await persist().catch(() => {});
		}
	}
}
