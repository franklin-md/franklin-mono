import type { SessionManager } from '../browser.js';
import type { IAuthManager } from '../auth/types.js';
import type { FranklinState, FranklinRuntime, FranklinAPI } from '../types.js';

export type FranklinExtensionApi = FranklinAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export type FranklinApp = {
	readonly agents: SessionManager<
		FranklinState,
		FranklinExtensionApi,
		FranklinRuntime
	>;
	readonly auth: IAuthManager;
	restore(): Promise<void>;
};
