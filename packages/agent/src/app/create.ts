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
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';

export async function createApp(
	extensions: FranklinExtension[],
	platform: Platform,
	auth: IAuthManager,
): Promise<FranklinApp> {
	const registry = new StoreRegistry();

	const system = systems(createCoreSystem(platform.spawn))
		.add(createStoreSystem(registry))
		.add(createEnvironmentSystem(platform.environment))
		.done();

	const agents = new SessionManager(system, extensions, auth);
	return { agents, auth };
}
