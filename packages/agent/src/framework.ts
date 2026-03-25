import type { FranklinApp, FranklinExtension } from './app.js';

export interface Framework {
	createApp: (extensions: FranklinExtension[]) => FranklinApp;
}
