import { createFilePersister } from '@franklin/agent';
import type { Persister } from '@franklin/agent';

/**
 * Creates a Persister for Electron renderer environments.
 *
 * File I/O is bridged to the main process via the preload's
 * `window.__franklinBridge.persist` API.
 */
export function createElectronPersister(dir: string): Persister {
	return createFilePersister(dir, window.__franklinBridge.persist);
}
