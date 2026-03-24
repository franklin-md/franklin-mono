import { getOAuthProvider } from '@mariozechner/pi-ai/oauth';
import type {
	OAuthLoginCallbacks,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

import type { AuthStore } from './store.js';

// ---------------------------------------------------------------------------
// OAuth login
// ---------------------------------------------------------------------------

/**
 * Run the OAuth login flow for a provider and persist the resulting
 * credentials to the store.
 *
 * The `callbacks` object drives the interactive parts of the flow
 * (opening a browser URL, prompting for user input, showing progress).
 *
 * Throws if the provider is not registered in pi-ai's OAuth registry.
 */
export async function loginOAuth(
	provider: OAuthProviderId,
	store: AuthStore,
	callbacks: OAuthLoginCallbacks,
): Promise<void> {
	const oauthProvider = getOAuthProvider(provider);
	if (!oauthProvider) {
		throw new Error(`Unknown OAuth provider: "${provider}"`);
	}

	const credentials = await oauthProvider.login(callbacks);
	store.setOAuthEntry(provider, { type: 'oauth', credentials });
}

// ---------------------------------------------------------------------------
// API key login
// ---------------------------------------------------------------------------

/**
 * Store a raw API key for a provider.
 *
 * Use this for providers that issue long-lived API keys (e.g. a custom
 * OpenAI-compatible endpoint or any provider not covered by OAuth).
 */
export function setApiKey(
	provider: string,
	key: string,
	store: AuthStore,
): void {
	store.setApiKeyEntry(provider, { type: 'apiKey', key });
}
