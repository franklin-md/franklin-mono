import {
	SessionManager,
	type FranklinApp,
	type FranklinExtension,
} from '../browser.js';
import { createPersistence } from '../agent/session/persist/file-persister.js';
import type { Platform } from '../platform.js';

export async function createApp(
	extensions: FranklinExtension[],
	platform: Platform,
): Promise<FranklinApp> {
	const persistence = createPersistence('.', platform.filesystem);
	const agents = new SessionManager(platform.spawn, extensions, persistence);
	await agents.restore();
	return { agents };
}
