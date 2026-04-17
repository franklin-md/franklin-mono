import { createPersistence } from '@franklin/agent';
import type { FranklinState } from '@franklin/agent';
import type { AbsolutePath, MapFilePersister } from '@franklin/lib';
import type { StoreSnapshot } from '@franklin/extensions';

import { createNodeFilesystem } from './platform/filesystem.js';

/**
 * Creates file-system-backed persistence for Node.js environments.
 *
 * Convenience wrapper that pairs `createPersistence` with
 * `createNodeFilesystem`.
 */
export function createNodePersistence(dir: AbsolutePath): {
	session: MapFilePersister<FranklinState>;
	store: MapFilePersister<StoreSnapshot>;
} {
	return createPersistence<FranklinState>(dir, createNodeFilesystem());
}
