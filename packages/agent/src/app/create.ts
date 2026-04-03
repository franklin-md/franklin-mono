import { DebouncedPersister } from '@franklin/lib';
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
import { createPersistence } from '../agent/session/persist/file-persister.js';
import type { Platform } from '../platform.js';
import type { IAuthManager } from '../auth/types.js';

export async function createApp(
	extensions: FranklinExtension[],
	platform: Platform,
	auth: IAuthManager,
): Promise<FranklinApp> {
	const persistence = createPersistence('.', platform.filesystem);
	const poolPersister = new DebouncedPersister(persistence.pool, 500);
	const registry = new StoreRegistry(poolPersister);

	const system = combineSystems(
		createCoreSystem(platform.spawn),
		combineSystems(
			createStoreSystem(registry),
			createEnvironmentSystem(platform.environment),
		),
	);

	const agents = new SessionManager(system, extensions, auth, registry, {
		session: persistence.session,
	});
	await agents.restore();
	return { agents, auth };
}
