import type { BaseState } from '../modules/state/index.js';
import type { AbsolutePath, Filesystem, RestoreResult } from '@franklin/lib';
import { StoreRegistry } from '../modules/store/api/index.js';
import { createPersistence } from './persistence.js';
import { createSettingsStore } from './settings.js';
import type { Storage } from './types.js';

export function createStorage<S extends BaseState>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): Storage<S> {
	const settings = createSettingsStore(filesystem, appDir);
	const persistence = createPersistence<S>(appDir, filesystem);
	const sessions = persistence.session;
	const stores = new StoreRegistry(persistence.store);

	return {
		settings,
		sessions,
		stores,
		async restore(): Promise<RestoreResult> {
			const [a, b] = await Promise.all([settings.restore(), stores.restore()]);
			return { issues: [...a.issues, ...b.issues] };
		},
	};
}
