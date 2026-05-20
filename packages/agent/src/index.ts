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
	FranklinState,
	FranklinRuntime,
	FranklinAPI,
	FranklinExtension,
} from './types.js';

export { FranklinApp } from './app/index.js';
export type {
	FranklinAppExtensionContext,
	FranklinAppExtensions,
} from './app/index.js';
export type { AuthStore } from './storage/types.js';

export { type Platform, type OperatingSystem } from './platform.js';
export * from './extensions/index.js';
export * from './modules/index.js';
export { createPersistence } from './storage/persistence.js';
