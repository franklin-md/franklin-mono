import type { SessionState, StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	DebouncedPersister,
	joinAbsolute,
	type AbsolutePath,
	type Filesystem,
	type Persister,
} from '@franklin/lib';

// TODO: Would be nice to get rid of these or at least move to their store.ts files.
/**
 * Creates file-backed persistence for sessions and stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createPersistence<S extends SessionState>(
	dir: AbsolutePath,
	fs: Filesystem,
): { session: Persister<S>; store: Persister<StoreSnapshot> } {
	return {
		session: new DebouncedPersister(
			createFilePersistence<S>(joinAbsolute(dir, 'sessions'), fs),
			500,
		),
		store: createFilePersistence<StoreSnapshot>(joinAbsolute(dir, 'store'), fs),
	};
}
