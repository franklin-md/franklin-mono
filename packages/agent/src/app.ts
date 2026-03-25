import type { CoreAPI, StoreAPI } from '@franklin/extensions';
import type { SessionManager } from './browser.js';

export type FranklinExtensionApi = CoreAPI & StoreAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export abstract class FranklinApp {
	constructor(protected readonly extensions: FranklinExtension[]) {}

	// API you construct the UI around
	abstract readonly agents: SessionManager;
}
