// Types
export type {
	OAuthCredentials,
	OAuthLoginCallbacks,
	OAuthProviderId,
	AuthEntry,
	OAuthEntry,
	ApiKeyEntry,
	AuthFile,
	IAuthStore,
	AuthChangeListener,
	IAuthManager,
} from './types.js';

// Store
export { AuthStore, DEFAULT_AUTH_PATH } from './store.js';
export { AuthManager } from './manager.js';

// Login
export { loginOAuth, setApiKey } from './login.js';

// Agent configuration
export { configureAgent } from './client.js';
