import {
	SessionManager,
	type FranklinApp,
	type FranklinExtension,
} from '../browser.js';
import type { Platform } from '../platform.js';

export function createApp(
	extensions: FranklinExtension[],
	platform: Platform,
): FranklinApp {
	return {
		agents: new SessionManager(platform.spawn, extensions),
	};
}
