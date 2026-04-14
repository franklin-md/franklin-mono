import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

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

/** Credential map keyed by provider ID (e.g. `"anthropic"`). */
export type AuthEntries = Record<string, AuthEntry>;

export type OAuthAuthInfo = {
	url: string;
	instructions?: string;
};

export type OAuthLoginCallbacks = {
	onAuth: (info: OAuthAuthInfo) => void;
	onProgress?: (message: string) => void;
};
