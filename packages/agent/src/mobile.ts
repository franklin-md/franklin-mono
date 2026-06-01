export { AuthManager } from './auth/manager.js';
export type { OAuthCredentials } from './auth/credentials.js';
export { createAuthStore } from './auth/store.js';
export type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
	OAuthAuthInfo,
	OAuthEntry,
} from './auth/types.js';
export type { AuthStore } from './auth/store.js';

export { FranklinApp } from './app/index.js';
export { getLLMConfig } from './settings/llm-config.js';
export type {
	FranklinSession,
	FranklinState,
	FranklinRuntime,
	FranklinAPI,
	FranklinExtension,
} from './types.js';

export { type Platform, type OperatingSystem } from './platform.js';
export { conversationExtension } from './extensions/conversation/index.js';
export { conversationTitleExtension } from './extensions/conversation-title/index.js';
export {
	createStatusControl,
	statusExtension,
} from './extensions/status/index.js';
export type {
	ConversationTurn,
	AssistantTurn,
	AssistantBlock,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from './extensions/conversation/index.js';
export type {
	ConversationTitle,
	ConversationTitleControl,
} from './extensions/conversation-title/index.js';
export type { StatusControl, StatusState } from './extensions/status/index.js';
export * from './modules/index.js';
