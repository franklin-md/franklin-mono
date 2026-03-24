import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

export type { OAuthCredentials, OAuthLoginCallbacks, OAuthProviderId } from '@mariozechner/pi-ai/oauth';

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

export type AuthEntry = OAuthEntry | ApiKeyEntry;

/** Shape of the on-disk auth file. Keyed by provider ID (e.g. `"anthropic"`). */
export type AuthFile = Record<string, AuthEntry>;
