import type { CoreAPI, StoreAPI } from '@franklin/extensions';
import type { SessionManager } from '../browser.js';
import type { AuthManager } from '../auth/manager.js';

export type FranklinExtensionApi = CoreAPI & StoreAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export type FranklinApp = {
	readonly agents: SessionManager;
	readonly auth: AuthManager;
};
