export { AuthManager } from './auth/manager.js';
export { OAuthFlow } from './auth/oauth-flow.js';
export type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
	OAuthAuthInfo,
	OAuthEntry,
	OAuthPrompt,
} from './auth/types.js';
export type { SettingsStore } from './settings/store.js';
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
