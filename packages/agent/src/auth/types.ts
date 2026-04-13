import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

export type { OAuthLoginCallbacks } from '@mariozechner/pi-ai/oauth';

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

export type OAuthAuthInfo = {
	url: string;
	instructions?: string;
};

export type OAuthPrompt = {
	message: string;
	placeholder?: string;
	allowEmpty?: boolean;
};

export interface IAuthFlow {
	onAuth(listener: (info: OAuthAuthInfo) => void): () => void;
	onProgress(listener: (message: string) => void): () => void;
	onPrompt(listener: (prompt: OAuthPrompt) => void): () => void;
	respond(value: string): Promise<void>;
	login(): Promise<void>;
	dispose(): Promise<void>;
}

/**
 * App-facing auth surface.
 *
 * The Node.js app owns a concrete `AuthManager`, while the Electron renderer
 * talks to this same surface through the platform proxy.
 */
export type AppAuth = {
	load(): Promise<AuthFile>;
	getApiKey(provider: string): Promise<string | undefined>;
	setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void>;
	removeApiKeyEntry(provider: string): Promise<void>;
	removeOAuthEntry(provider: string): Promise<void>;
	onAuthChange(listener: AuthChangeListener): () => void;
	flow(provider: string): Promise<IAuthFlow>;
	openExternal(url: string): Promise<void>;
	getOAuthProviders(): Promise<{ id: string; name: string }[]>;
	getApiKeyProviders(): Promise<string[]>;
};
