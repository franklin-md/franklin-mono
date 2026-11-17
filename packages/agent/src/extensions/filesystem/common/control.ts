import { encode } from '@franklin/lib';
import type { Filesystem } from '@franklin/lib';
import type { Store } from '../../../modules/store/api/types.js';
import { snapshotChanged } from './changed.js';
import { migrateV1ToV2 } from './migrate-v1-to-v2.js';
import { createFileSnapshot } from './snapshot.js';
import type { FileRecord, FileSnapshot, LineRange } from './types.js';

export function createFileControl(store: Store<FileRecord>) {
	migrateV1ToV2(store);

	async function getSnapshot(
		fs: Filesystem,
		path: string,
	): Promise<FileSnapshot> {
		const absPath = await fs.resolve(path);
		const snapshot = store.get()[absPath];
		if (snapshot === undefined) {
			throw new Error('File cannot be edited if you have never read it.');
		}
		return snapshot;
	}

	return {
		getSnapshot,
		/**
		 * Compare current bytes with the last read, optionally over complete lines.
		 * Hash-only snapshots require whole-file freshness. This never records a read.
		 */
		changedSinceRead: async (
			fs: Filesystem,
			path: string,
			current: Uint8Array,
			range?: LineRange,
		): Promise<boolean> => {
			const saved = await getSnapshot(fs, path);
			return snapshotChanged(saved, createFileSnapshot(current), range);
		},
		/**
		 * Record the latest hash and, for UTF-8 text, one full snapshot per path.
		 * If `content` is omitted, reads the file from disk.
		 */
		markFileRead: async (
			fs: Filesystem,
			path: string,
			content?: string | Uint8Array,
		): Promise<void> => {
			const absPath = await fs.resolve(path);
			const data = content ?? (await fs.readFile(absPath));
			const bytes = typeof data === 'string' ? encode(data) : data;
			const snapshot = createFileSnapshot(bytes);
			store.set((draft: FileRecord) => {
				draft[absPath] = snapshot;
			});
		},
	};
}
