import type {
	OAuthLoginCallbacks,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

import type { IAuthManager } from './types.js';

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
	manager: IAuthManager,
	callbacks: OAuthLoginCallbacks,
): Promise<void> {
	await manager.loginOAuth(provider, callbacks);
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
export async function setApiKey(
	provider: string,
	key: string,
	manager: IAuthManager,
): Promise<void> {
	await manager.setApiKey(provider, key);
}
