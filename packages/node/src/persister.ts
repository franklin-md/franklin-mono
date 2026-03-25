import { createPersistence } from '@franklin/agent';
import type { SessionSnapshot } from '@franklin/agent';
import type { Persister } from '@franklin/lib';
import type { StoreSnapshot } from '@franklin/extensions';

import { createNodeFilesystem } from './filesystem.js';

/**
 * Creates file-system-backed persistence for Node.js environments.
 *
 * Convenience wrapper that pairs `createPersistence` with
 * `createNodeFilesystem`.
 */
export function createNodePersistence(dir: string): {
	session: Persister<SessionSnapshot>;
	pool: Persister<StoreSnapshot>;
} {
	return createPersistence(dir, createNodeFilesystem());
}
