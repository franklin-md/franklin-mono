import {
	StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	systems,
} from '@franklin/extensions';
import {
	SessionManager,
	type FranklinApp,
	type FranklinExtension,
} from '../browser.js';
import { SessionRegistry } from '../agent/session/registry.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import { withAuth, syncAuth } from '../auth/with-auth.js';
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';
import type { FranklinState, FranklinRuntime } from '../types.js';

export type AppOptions = {
	extensions: FranklinExtension[];
	platform: Platform;
	auth: IAuthManager;
	persistDir?: string;
};

export async function createApp(opts: AppOptions): Promise<FranklinApp> {
	const { extensions, platform, auth, persistDir } = opts;

	const persistence = persistDir
		? createPersistence<FranklinState>(persistDir, platform.filesystem)
		: undefined;

	const storeRegistry = new StoreRegistry(persistence?.store);
	const sessionRegistry = new SessionRegistry<FranklinState, FranklinRuntime>(
		persistence?.session,
	);

	const coreSystem = withAuth(createCoreSystem(platform.spawn), auth);

	const system = systems(coreSystem)
		.add(createStoreSystem(storeRegistry))
		.add(createEnvironmentSystem(platform.environment))
		.done();

	syncAuth(sessionRegistry, auth);

	const agents = new SessionManager(sessionRegistry, system, extensions);

	return {
		agents,
		auth,
		async restore() {
			await storeRegistry.restore();
			await agents.restore();
		},
	};
}
