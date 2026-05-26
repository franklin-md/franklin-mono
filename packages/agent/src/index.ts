export { AuthManager } from './auth/manager.js';
export type {
	AuthDependencyModule,
	AuthDependencyRuntime,
} from './auth/dependency.js';
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
export type { SettingsStore } from './settings/store.js';
export type { AppSettings } from './settings/schema.js';
export { getLLMConfig } from './settings/llm-config.js';
export type {
	FranklinSession,
	FranklinState,
	FranklinRuntime,
	FranklinAPI,
	FranklinExtension,
} from './types.js';

export { FranklinApp } from './app/index.js';
export type { AuthStore } from './auth/store.js';

export { type Platform, type OperatingSystem } from './platform.js';
export * from './extensions/index.js';
export * from './modules/index.js';
export type {
	Reference,
	ReferenceContext,
	ReferenceEngine,
	ReferenceHandler,
	ReferenceHandlerRuntime,
	ReferencesAPI,
	ReferencesModule,
	ReferencesRuntime,
	ReferencesSignature,
} from './references/index.js';
export {
	createReferencesCompiler,
	createReferencesModule,
	createReferencesRuntime,
	filesystemFileReferenceHandler,
	pdfDocumentReferenceHandler,
	referenceContextsToContent,
	referenceContextToContent,
	referencesExtension,
	textDocumentReferenceHandler,
} from './references/index.js';
