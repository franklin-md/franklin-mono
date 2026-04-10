export { PersistedSessionCollection as SessionRegistry } from './agent/session/registry.js';
export { AuthManager } from './auth/manager.js';
export type {
	AuthFile,
	ApiKeyEntry,
	OAuthLoginCallbacks,
	IAuthManager,
	OAuthEntry,
	AuthChangeListener,
	AuthEntry,
} from './auth/types.js';
export type { SettingsStore } from './settings/store.js';
export type { AppSettings } from './settings/types.js';
export { getLLMConfig, setLLMConfig } from './settings/llm-config.js';
export type {
	FranklinState,
	FranklinRuntime,
	FranklinAPI,
	FranklinExtension,
} from './types.js';

export { FranklinApp } from './app/index.js';
export type { Agents } from './app/agents.js';

export { type Platform } from './platform.js';
