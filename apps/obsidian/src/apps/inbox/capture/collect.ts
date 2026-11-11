import type { Store } from '@franklin/agent';
import type { CaptureOptions, CaptureSnapshot } from './types.js';
import { errorMessage } from '../controller/error.js';

export async function collectCards(
	store: Store<CaptureSnapshot>,
	readCards: CaptureOptions['readCards'],
	persist: () => Promise<void>,
): Promise<void> {
	const episode = store.get().pending;
	if (!episode || episode.endedAt === undefined || episode.phase === 'saving')
		return;
	store.set((draft) => {
		if (draft.pending) {
			draft.pending.phase = 'stopped';
			delete draft.pending.error;
		}
	});
	// Persist Stop before touching Mochi, including when recovering a failed
	// Stop save. Retries never widen the original [start, end) interval.
	await persist();
	try {
		const snapshot = await readCards(
			episode.databasePath,
			episode.startedAt,
			episode.endedAt,
			episode.draftBaseline?.cardIds ?? [],
		);
		store.set((draft) => {
			if (!draft.pending) return;
			draft.pending.snapshots.push(snapshot);
			draft.pending.phase = 'reviewing';
		});
		await persist();
	} catch (error) {
		store.set((draft) => {
			if (draft.pending) {
				draft.pending.phase = 'stopped';
				draft.pending.error = errorMessage(error);
			}
		});
		await persist().catch(() => {});
		throw error;
	}
}
