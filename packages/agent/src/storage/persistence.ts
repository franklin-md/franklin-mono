import type { SessionState, StoreSnapshot } from '@franklin/extensions';
import {
	createFilePersistence,
	DebouncedPersister,
	joinAbsolute,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import type { FilePersistence } from './types.js';

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
): FilePersistence<S> {
	return {
		session: new DebouncedPersister(
			createFilePersistence<S>(joinAbsolute(dir, 'sessions'), fs),
			500,
		),
		store: createFilePersistence<StoreSnapshot>(joinAbsolute(dir, 'store'), fs),
	};
}
