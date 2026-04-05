import type { StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	type Filesystem,
	type Persister,
} from '@franklin/lib';
import type { SessionSnapshot } from '../types.js';

/**
 * Creates file-backed persistence for sessions and pool stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createPersistence<S>(
	dir: string,
	fs: Filesystem,
): { session: Persister<SessionSnapshot<S>>; pool: Persister<StoreSnapshot> } {
	return {
		session: createFilePersistence<SessionSnapshot<S>>(`${dir}/sessions`, fs),
		pool: createFilePersistence<StoreSnapshot>(`${dir}/store`, fs),
	};
}

/**
 * Creates a session-only Persister backed by JSON files.
 *
 * Layout: `{dir}/sessions/{sessionId}.json`
 */
export function createSessionPersister<S>(
	dir: string,
	fs: Filesystem,
): Persister<SessionSnapshot<S>> {
	return createFilePersistence<SessionSnapshot<S>>(`${dir}/sessions`, fs);
}

/**
 * Creates a pool-store persister backed by JSON files.
 *
 * Layout: `{dir}/store/{ref}.json`
 */
export function createStorePersister(
	dir: string,
	fs: Filesystem,
): Persister<StoreSnapshot> {
	return createFilePersistence<StoreSnapshot>(`${dir}/store`, fs);
}
