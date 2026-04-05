import {
	StorePool as StoreRegistry,
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
import { withAuth, syncAuth } from '../auth/with-auth.js';
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';

export async function createApp(
	extensions: FranklinExtension[],
	platform: Platform,
	auth: IAuthManager,
): Promise<FranklinApp> {
	const storeRegistry = new StoreRegistry();
	const sessionRegistry = new SessionRegistry();

	const coreSystem = withAuth(createCoreSystem(platform.spawn), auth);

	const system = systems(coreSystem)
		.add(createStoreSystem(storeRegistry))
		.add(createEnvironmentSystem(platform.environment))
		.done();

	syncAuth(sessionRegistry, auth);

	const agents = new SessionManager(sessionRegistry, system, extensions);
	return { agents, auth };
}
