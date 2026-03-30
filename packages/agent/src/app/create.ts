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
	// const auth = new AuthManager(platform);
	const agents = new SessionManager(
		platform.spawn,
		extensions,
		auth,
		platform.environment,
		persistence,
	);
	await agents.restore();
	return { agents, auth: auth };
}
