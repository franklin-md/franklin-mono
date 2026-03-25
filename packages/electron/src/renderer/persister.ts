import { createPersistence } from '@franklin/agent';
import type { SessionSnapshot, Persister } from '@franklin/agent';
import type { StoreSnapshot } from '@franklin/extensions';

export interface ElectronPersistence {
	session: Persister<SessionSnapshot>;
	pool: Persister<StoreSnapshot>;
}

/**
 * Creates persistence for Electron renderer environments.
 *
 * File I/O is bridged to the main process via the preload's
 * `window.__franklinBridge.filesystem` API.
 */
export async function createElectronPersistence(
	dir?: string,
): Promise<ElectronPersistence> {
	const rootDir = dir ?? (await window.__franklinBridge.app.getStorage());
	return createPersistence(rootDir, window.__franklinBridge.filesystem);
}
