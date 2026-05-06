import type { BaseState, StoreSnapshot } from '@franklin/extensions';
import {
	createMapFilePersister,
	DebouncedPersister,
	joinAbsolute,
	rawCodec,
	versioned,
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
 *
 * Session state and store values are extension-composed / arbitrary, so
 * they use `rawCodec` (envelope only, no validation). Future work can
 * tighten these to proper zod schemas without a disk-format migration.
 */
export function createPersistence<S extends BaseState>(
	dir: AbsolutePath,
	fs: Filesystem,
): FilePersistence<S> {
	const sessionCodec = versioned().version(1, rawCodec<S>()).build();
	const storeCodec = versioned().version(1, rawCodec<StoreSnapshot>()).build();

	return {
		session: new DebouncedPersister(
			createMapFilePersister<S>(
				fs,
				joinAbsolute(dir, 'sessions'),
				sessionCodec,
			),
			500,
		),
		store: new DebouncedPersister(
			createMapFilePersister<StoreSnapshot>(
				fs,
				joinAbsolute(dir, 'store'),
				storeCodec,
			),
			500,
		),
	};
}
