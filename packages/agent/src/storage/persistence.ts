import type { BaseState } from '../modules/state/index.js';
import {
	createMapFilePersister,
	DebouncedPersister,
	joinAbsolute,
	rawCodec,
	versioned,
	type AbsolutePath,
	type Codec,
	type Filesystem,
} from '@franklin/lib';
import type { StoreSnapshot } from '../modules/store/api/index.js';
import type { FilePersistence } from './types.js';

/**
 * Creates file-backed persistence for sessions and stores.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 *
 * The app provides the session codec because it owns the composed session
 * contract. Store values remain extension-composed / arbitrary, so they use
 * `rawCodec` (envelope only, no validation).
 */
export function createPersistence<S extends BaseState>(
	dir: AbsolutePath,
	fs: Filesystem,
	sessionCodec: Codec<S>,
): FilePersistence<S> {
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
