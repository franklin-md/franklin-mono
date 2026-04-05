import type { StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	DebouncedPersister,
	type Filesystem,
	type Persister,
} from '@franklin/lib';
import type { SessionSnapshot } from '../types.js';

/**
 * Creates file-backed persistence for sessions and stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createPersistence<S>(
	dir: string,
	fs: Filesystem,
): { session: Persister<SessionSnapshot<S>>; store: Persister<StoreSnapshot> } {
	return {
		session: new DebouncedPersister(
			createFilePersistence<SessionSnapshot<S>>(`${dir}/sessions`, fs),
			500,
		),
		store: createFilePersistence<StoreSnapshot>(`${dir}/store`, fs),
	};
}
