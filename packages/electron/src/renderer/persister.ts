import { createFilePersistence } from '@franklin/agent';
import type { SessionSnapshot, Persister } from '@franklin/agent';
import type { StoreSnapshot } from '@franklin/extensions';

interface ElectronPersistence {
	session: Persister<SessionSnapshot>;
	pool: Persister<StoreSnapshot>;
}

function createDeferredPersister<T>(
	resolve: () => Promise<Persister<T>>,
): Persister<T> {
	let persisterPromise: Promise<Persister<T>> | null = null;

	function getPersister(): Promise<Persister<T>> {
		persisterPromise ??= resolve();
		return persisterPromise;
	}

	return {
		async save(key, value) {
			const persister = await getPersister();
			await persister.save(key, value);
		},

		async load() {
			const persister = await getPersister();
			return persister.load();
		},

		async delete(key) {
			const persister = await getPersister();
			await persister.delete(key);
		},
	};
}

/**
 * Creates persistence for Electron renderer environments.
 *
 * File I/O is bridged to the main process via the preload's
 * `window.__franklinBridge.filesystem` API.
 */
export function createElectronPersistence(dir?: string): ElectronPersistence {
	let persistencePromise: Promise<ElectronPersistence> | null = null;

	function getPersistence(): Promise<ElectronPersistence> {
		persistencePromise ??= (async () => {
			const rootDir = dir ?? (await window.__franklinBridge.app.getStorage());
			return {
				session: createFilePersistence<SessionSnapshot>(
					`${rootDir}/sessions`,
					window.__franklinBridge.filesystem,
				),
				pool: createFilePersistence<StoreSnapshot>(
					`${rootDir}/store`,
					window.__franklinBridge.filesystem,
				),
			};
		})();

		return persistencePromise;
	}

	return {
		session: createDeferredPersister(
			async () => (await getPersistence()).session,
		),
		pool: createDeferredPersister(async () => (await getPersistence()).pool),
	};
}
