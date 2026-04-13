import type { SessionState, StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	DebouncedPersister,
	type Filesystem,
	type Persister,
} from '@franklin/lib';

/**
 * Creates file-backed persistence for sessions and stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createPersistence<S extends SessionState>(
	dir: string,
	fs: Filesystem,
): { session: Persister<S>; store: Persister<StoreSnapshot> } {
	return {
		session: new DebouncedPersister(
			createFilePersistence<S>(`${dir}/sessions`, fs),
			500,
		),
		store: createFilePersistence<StoreSnapshot>(`${dir}/store`, fs),
	};
}
