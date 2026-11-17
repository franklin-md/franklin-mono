import type { Store } from '../../../modules/store/api/types.js';
import type { FileRecord, FileSnapshot } from './types.js';

// TODO(franklin-37g): Replace this local migration with optional versioning and
// migration chains for extension stores once that shared infrastructure exists.
export function migrateV1ToV2(store: Store<FileRecord>): void {
	store.set((draft) => {
		// Restored JSON can still contain the v1 hash-string representation.
		const previous: Record<string, string | FileSnapshot> = draft;
		for (const [path, snapshot] of Object.entries(previous)) {
			if (typeof snapshot === 'string') draft[path] = { hash: snapshot };
		}
	});
}
