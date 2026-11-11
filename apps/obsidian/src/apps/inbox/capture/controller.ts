import { createStore } from '@franklin/agent';
import type { ReadonlyStore, Store } from '@franklin/agent';
import type { InboxQuestion } from '../controller/types.js';
import { errorMessage } from '../controller/error.js';
import { collectCards } from './collect.js';
import { pinResearch } from './pin-research.js';
import type {
	CaptureDocument,
	CaptureOptions,
	CaptureSnapshot,
} from './types.js';

export class CaptureController {
	readonly state: ReadonlyStore<CaptureSnapshot>;
	private readonly store: Store<CaptureSnapshot>;
	private operation?: Promise<void>;
	private operationName?: string;
	private closed = false;
	private restoreFailed = false;

	private constructor(
		private readonly options: CaptureOptions,
		initial: CaptureDocument,
	) {
		this.store = createStore({ ...initial, busy: false });
		this.state = this.store;
	}

	static async create(options: CaptureOptions): Promise<CaptureController> {
		const controller = new CaptureController(options, {
			version: 1,
			settings: options.defaults,
			completed: [],
		});
		try {
			const saved = await options.load();
			if (saved) controller.store.set(() => ({ ...saved, busy: false }));
		} catch {
			controller.restoreFailed = true;
			controller.store.set((draft) => {
				draft.storageError =
					'Could not restore capture.json. The original file was preserved. Restore it and retry recording.';
			});
		}
		return controller;
	}

	start(question: InboxQuestion, ancestors: InboxQuestion[]): Promise<void> {
		// Reserve the operation before yielding: repeated clicks share one ID/window.
		const startedAt = Date.now();
		return this.work('start:' + question.id, async () => {
			if (this.restoreFailed)
				throw new Error('Restore capture.json before starting a recording');
			const current = this.store.get();
			if (
				current.pending?.question.id === question.id &&
				current.pending.phase === 'recording'
			)
				return;
			if (question.state.kind !== 'answered')
				throw new Error('Record an answered question');
			this.options.validateSettings(current.settings);
			const pinned = structuredClone({ question, ancestors });
			const draftBaseline = {
				cardIds: await this.options.readDraftIds(current.settings.databasePath),
				capturedAt: Date.now(),
				source: 'record-start' as const,
			};
			const research = await pinResearch(
				pinned.question,
				pinned.ancestors,
				this.options.evidence,
			);
			// The switch click is both the old exclusive end and the new start.
			// Finish durably before replacing pending, so a failed save loses neither
			// the original recording nor its pinned snapshot.
			await this.finish(startedAt);
			this.store.set((draft) => {
				draft.pending = {
					id: crypto.randomUUID(),
					folder: current.settings.collectionFolder,
					databasePath: current.settings.databasePath,
					...pinned,
					startedAt,
					draftBaseline,
					phase: 'recording',
					research,
					snapshots: [],
					excludedCardIds: [],
				};
			});
			await this.persist();
			this.options.notify('Recording started.');
		});
	}

	stop(): Promise<void> {
		const endedAt = Date.now();
		return this.work('complete', () => this.finish(endedAt));
	}

	configure(settings: CaptureDocument['settings']): Promise<void> {
		return this.work('configure:' + JSON.stringify(settings), async () => {
			this.options.validateSettings(settings);
			this.store.set((draft) => {
				draft.settings = { ...settings };
			});
			await this.persist();
		});
	}

	retry(): Promise<void> {
		return this.work('retry', async () => {
			if (this.restoreFailed) {
				const saved = await this.options.load();
				if (!saved) throw new Error('The capture journal is still missing');
				this.store.set(() => ({ ...saved, busy: true }));
				this.restoreFailed = false;
			}
			if (this.store.get().pending?.phase === 'recording') await this.persist();
			else if (this.store.get().pending) await this.finish(Date.now());
			else await this.persist();
		});
	}

	async dispose(): Promise<void> {
		this.closed = true;
		await this.operation?.catch(() => {});
	}

	private async finish(endedAt: number): Promise<void> {
		const current = this.store.get().pending;
		if (!current) return;
		if (current.endedAt === undefined) {
			if (endedAt < current.startedAt)
				throw new Error(
					'The clock moved backwards. Correct it before stopping this recording.',
				);
			this.store.set((draft) => {
				if (!draft.pending) return;
				draft.pending.endedAt = endedAt;
				draft.pending.phase = 'stopped';
			});
		}
		if (
			current.phase !== 'saving' &&
			(current.phase !== 'reviewing' || current.error)
		)
			await this.collect();
		const episode = this.store.get().pending;
		const latest = episode?.snapshots.at(-1);
		if (!episode || !latest) throw new Error('Recording has no card snapshot');
		// Legacy reviews retain any exclusions already made by the user. New
		// recordings use all matched cards and never require a confirmation step.
		const selected = latest.cards.filter(
			(card) => !episode.excludedCardIds.includes(card.id),
		);
		let completed: CaptureDocument['completed'][number] | undefined;
		if (selected.length) {
			const completedAt =
				episode.completedAt ?? episode.confirmedAt ?? Date.now();
			this.store.set((draft) => {
				if (!draft.pending) return;
				draft.pending.phase = 'saving';
				draft.pending.completedAt = completedAt;
			});
			await this.persist();
			const saving = this.store.get().pending;
			if (!saving) return;
			const path = await this.options.writeEpisode(saving);
			completed = {
				id: saving.id,
				path,
				questionId: saving.question.id,
				attemptId: saving.question.attemptId,
				cardCount: selected.length,
				completedAt,
			};
		}
		const next = this.checkpointData();
		if (completed)
			next.completed = [
				...next.completed.filter((item) => item.id !== episode.id),
				completed,
			];
		delete next.pending;
		// A failed completion checkpoint leaves pending intact for an idempotent
		// retry of the same file and snapshot; it must not requery Mochi.
		await this.options.save(next);
		this.store.set(() => ({ ...next, busy: true }));
		this.options.notify(
			selected.length
				? `Recording completed: ${selected.length} ${selected.length === 1 ? 'card' : 'cards'} saved.`
				: 'Recording completed: no cards saved.',
		);
	}

	private collect(): Promise<void> {
		return collectCards(
			this.store,
			(path, start, end, drafts) =>
				this.options.readCards(path, start, end, drafts),
			() => this.persist(),
		);
	}

	private checkpointData(): CaptureDocument {
		const { busy: _busy, storageError: _error, ...data } = this.store.get();
		return structuredClone(data);
	}

	private async persist(): Promise<void> {
		if (this.restoreFailed)
			throw new Error(
				'The capture journal could not be restored; original preserved',
			);
		await this.options.save(this.checkpointData());
		this.store.set((draft) => {
			delete draft.storageError;
		});
	}

	private work(name: string, operation: () => Promise<void>): Promise<void> {
		if (this.closed) return Promise.reject(new Error('Capture is closed'));
		if (this.operation) {
			if (this.operationName === name) return this.operation;
			return this.operation
				.catch(() => {})
				.then(() => this.work(name, operation));
		}
		this.operationName = name;
		this.store.set((draft) => {
			draft.busy = true;
		});
		this.operation = Promise.resolve()
			.then(operation)
			.catch((error: unknown) => {
				this.store.set((draft) => {
					draft.storageError = errorMessage(error);
				});
				throw error;
			})
			.finally(() => {
				this.operation = undefined;
				this.operationName = undefined;
				this.store.set((draft) => {
					draft.busy = false;
				});
			});
		return this.operation;
	}
}
