export { AuthManager } from './auth/manager.js';
export type { OAuthCredentials } from './auth/credentials.js';
export type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
	OAuthAuthInfo,
	OAuthEntry,
} from './auth/types.js';
export type { SettingsStore } from './settings/store.js';
export type { AppSettings } from './settings/schema.js';
export { getLLMConfig } from './settings/llm-config.js';
export type {
	FranklinSystem,
	FranklinState,
	FranklinRuntime,
	FranklinAPI,
	FranklinExtension,
} from './types.js';

export { FranklinApp } from './app/index.js';
export type { Agents } from './app/agents.js';

export { type Platform, type OperatingSystem } from './platform.js';
