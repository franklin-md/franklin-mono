import { createFilePersistence } from '@franklin/agent';
import type { SessionSnapshot, Persister } from '@franklin/agent';
import type { PoolStoreSnapshot } from '@franklin/extensions';

/**
 * Creates persistence for Electron renderer environments.
 *
 * File I/O is bridged to the main process via the preload's
 * `window.__franklinBridge.persist` API.
 */
export function createElectronPersistence(dir: string): {
	session: Persister<SessionSnapshot>;
	pool: Persister<PoolStoreSnapshot>;
} {
	return {
		session: createFilePersistence<SessionSnapshot>(
			`${dir}/sessions`,
			window.__franklinBridge.persist,
		),
		pool: createFilePersistence<PoolStoreSnapshot>(
			`${dir}/store`,
			window.__franklinBridge.persist,
		),
	};
}
