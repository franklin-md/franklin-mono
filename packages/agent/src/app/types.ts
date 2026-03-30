import type { CoreAPI, StoreAPI, EnvironmentAPI } from '@franklin/extensions';
import type { SessionManager } from '../browser.js';
import type { IAuthManager } from '../auth/types.js';

export type FranklinExtensionApi = CoreAPI & StoreAPI & EnvironmentAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export type FranklinApp = {
	readonly agents: SessionManager;
	readonly auth: IAuthManager;
};
