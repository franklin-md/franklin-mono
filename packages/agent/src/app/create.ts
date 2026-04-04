import {
	StorePool as StoreRegistry,
	createCoreSystem,
	createStoreSystem,
	createEnvironmentSystem,
	combineSystems,
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

	const system = combineSystems(
		createCoreSystem(platform.spawn),
		combineSystems(
			createStoreSystem(registry),
			createEnvironmentSystem(platform.environment),
		),
	);

	const agents = new SessionManager(system, extensions, auth);
	return { agents, auth };
}
