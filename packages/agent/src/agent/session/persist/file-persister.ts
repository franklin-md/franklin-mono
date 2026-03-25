import type { StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	type PersistenceFilesystem,
	type Persister,
} from '@franklin/lib';
import type { SessionSnapshot } from './types.js';

/**
 * Creates file-backed persistence for sessions and pool stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createPersistence(
	dir: string,
	fs: PersistenceFilesystem,
): { session: Persister<SessionSnapshot>; pool: Persister<StoreSnapshot> } {
	return {
		session: createFilePersistence<SessionSnapshot>(`${dir}/sessions`, fs),
		pool: createFilePersistence<StoreSnapshot>(`${dir}/store`, fs),
	};
}

/**
 * Creates a session-only Persister backed by JSON files.
 *
 * Layout: `{dir}/sessions/{sessionId}.json`
 */
export function createFileSessionPersister(
	dir: string,
	fs: PersistenceFilesystem,
): Persister<SessionSnapshot> {
	return createFilePersistence<SessionSnapshot>(`${dir}/sessions`, fs);
}

/**
 * Creates a pool-store persister backed by JSON files.
 *
 * Layout: `{dir}/store/{ref}.json`
 */
export function createFilePoolPersister(
	dir: string,
	fs: PersistenceFilesystem,
): Persister<StoreSnapshot> {
	return createFilePersistence<StoreSnapshot>(`${dir}/store`, fs);
}
