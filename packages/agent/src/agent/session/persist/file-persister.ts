import type { PoolStoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	type FileSystemOps,
	type Persister,
} from '@franklin/lib';
import type { SessionSnapshot } from './types.js';

/**
 * Creates a session-only Persister backed by JSON files.
 *
 * Layout: `{dir}/sessions/{sessionId}.json`
 */
export function createFileSessionPersister(
	dir: string,
	fs: FileSystemOps,
): Persister<SessionSnapshot> {
	return createFilePersistence<SessionSnapshot>(`${dir}/sessions`, fs);
}

/**
 * Creates a pool-store persister backed by JSON files.
 *
 * Layout: `{dir}/store/{poolId}.json`
 */
export function createFilePoolPersister(
	dir: string,
	fs: FileSystemOps,
): Persister<PoolStoreSnapshot> {
	return createFilePersistence<PoolStoreSnapshot>(`${dir}/store`, fs);
}
