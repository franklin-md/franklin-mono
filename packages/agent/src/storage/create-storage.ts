import type { BaseState } from '../modules/state/index.js';
import type {
	AbsolutePath,
	Codec,
	Filesystem,
	RestoreResult,
} from '@franklin/lib';
import { StoreRegistry } from '../modules/store/api/index.js';
import { createAuthStore } from './auth.js';
import { createPersistence } from './persistence.js';
import { createSettingsStore } from './settings.js';
import type { AuthStore, Storage } from './types.js';

type CreateStorageOptions<S extends BaseState> = {
	readonly sessionCodec: Codec<S>;
	readonly authStore?: AuthStore;
};

export function createStorage<S extends BaseState>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
	opts: CreateStorageOptions<S>,
): Storage<S> {
	const settings = createSettingsStore(filesystem, appDir);
	const auth = opts.authStore ?? createAuthStore(filesystem, appDir);
	const persistence = createPersistence<S>(
		appDir,
		filesystem,
		opts.sessionCodec,
	);
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
