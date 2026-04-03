import type { SessionManager } from '../browser.js';
import type { IAuthManager } from '../auth/types.js';
import type { SessionAPI } from '../types.js';

export type FranklinExtensionApi = SessionAPI;
export type FranklinExtension = (api: FranklinExtensionApi) => void;

export type FranklinApp = {
	readonly agents: SessionManager;
	readonly auth: IAuthManager;
};
