import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

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

/**
 * Minimal auth-store interface used by UI components.
 * Both the Node.js `AuthStore` and the Electron renderer proxy satisfy this.
 */
export interface IAuthStore {
	load(): AuthFile;
	setApiKeyEntry(provider: string, entry: ApiKeyEntry): void;
	removeApiKeyEntry(provider: string): void;

	setOAuthEntry(provider: string, entry: OAuthEntry): void;
	removeOAuthEntry(provider: string): void;

	setEntry(provider: string, entry: AuthEntry): void;
	removeEntry(provider: string): void;
}
