import type {
	OAuthCredentials,
	OAuthLoginCallbacks,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

export type {
	OAuthCredentials,
	OAuthLoginCallbacks,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

// ---------------------------------------------------------------------------
// Stored credential entries
// ---------------------------------------------------------------------------

/** OAuth credentials entry — stored after a successful login flow. */
export type OAuthEntry = {
	type: 'oauth';
	credentials: OAuthCredentials;
};

/** A raw API key entry — stored when the user provides a key directly. */
export type ApiKeyEntry = {
	type: 'apiKey';
	key: string;
};

export type AuthEntry = {
	oauth?: OAuthEntry;
	apiKey?: ApiKeyEntry;
};

/** Shape of the on-disk auth file. Keyed by provider ID (e.g. `"anthropic"`). */
export type AuthFile = Record<string, AuthEntry>;

export type AuthChangeListener = (
	provider: string,
	authKey: string | undefined,
) => void | Promise<void>;

/**
 * Minimal auth-store interface used by UI components.
 * Both the Node.js `AuthStore` and the Electron renderer proxy satisfy this.
 */
export interface IAuthStore {
	load(): Promise<AuthFile>;
	getEntry(provider: string): Promise<AuthEntry | undefined>;
	getApiKey(provider: string): Promise<string | undefined>;

	setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void>;
	removeApiKeyEntry(provider: string): Promise<void>;

	setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void>;
	removeOAuthEntry(provider: string): Promise<void>;

	setEntry(provider: string, entry: AuthEntry): Promise<void>;
	removeEntry(provider: string): Promise<void>;
}

export interface IAuthManager extends IAuthStore {
	onAuthChange(listener: AuthChangeListener): () => void;
	loginOAuth(
		provider: OAuthProviderId,
		callbacks: OAuthLoginCallbacks,
	): Promise<void>;
	setApiKey(provider: string, key: string): Promise<void>;
}
