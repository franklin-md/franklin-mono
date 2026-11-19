import type { AuthEntry } from '@franklin/agent';
import { toApiKeyName, toOAuthName } from './key-names.js';
import {
	decodeApiKey,
	decodeOAuth,
	encodeApiKey,
	encodeOAuth,
} from './schema.js';
import type { ObsidianSecretStorage } from './types.js';
import { setObsidianSecret } from './set-secret.js';

export function readEntry(
	storage: ObsidianSecretStorage,
	provider: string,
): AuthEntry | null {
	const apiKeyRaw = storage.getSecret(toApiKeyName(provider));
	const oauthRaw = storage.getSecret(toOAuthName(provider));

	const apiKey = apiKeyRaw ? decodeApiKey(apiKeyRaw) : undefined;
	const oauth = oauthRaw ? decodeOAuth(oauthRaw) : undefined;

	if (!apiKey && !oauth) return null;
	return { ...(apiKey && { apiKey }), ...(oauth && { oauth }) };
}

export function writeEntry(
	storage: ObsidianSecretStorage,
	provider: string,
	entry: AuthEntry,
): void {
	setObsidianSecret(
		storage,
		toApiKeyName(provider),
		entry.apiKey ? encodeApiKey(entry.apiKey) : '',
	);
	setObsidianSecret(
		storage,
		toOAuthName(provider),
		entry.oauth ? encodeOAuth(entry.oauth) : '',
	);
}

export function tombstoneEntry(
	storage: ObsidianSecretStorage,
	provider: string,
): void {
	setObsidianSecret(storage, toApiKeyName(provider), '');
	setObsidianSecret(storage, toOAuthName(provider), '');
}
