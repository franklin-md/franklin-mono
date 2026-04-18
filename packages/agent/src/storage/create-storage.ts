import { StoreRegistry } from '@franklin/extensions';
import type { SessionState } from '@franklin/extensions';
import type { AbsolutePath, Filesystem, RestoreResult } from '@franklin/lib';
import { createAuthStore } from './auth.js';
import { createPersistence } from './persistence.js';
import { createSettingsStore } from './settings.js';
import type { Storage } from './types.js';

export function createStorage<S extends SessionState>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): Storage<S> {
	const settings = createSettingsStore(filesystem, appDir);
	const auth = createAuthStore(filesystem, appDir);
	const persistence = createPersistence<S>(appDir, filesystem);
	const sessions = persistence.session;
	const stores = new StoreRegistry(persistence.store);

	return {
		settings,
		auth,
		sessions,
		stores,
		async restore(): Promise<RestoreResult> {
			const [a, b, c] = await Promise.all([
				settings.restore(),
				auth.restore(),
				stores.restore(),
			]);
			return { issues: [...a.issues, ...b.issues, ...c.issues] };
		},
	};
}
