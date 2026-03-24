import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import type {
	OAuthCredentials,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

import type { ApiKeyEntry, AuthEntry, AuthFile, OAuthEntry } from './types.js';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

export const DEFAULT_AUTH_PATH = join(homedir(), '.franklin', 'auth.json');

// ---------------------------------------------------------------------------
// AuthStore
// ---------------------------------------------------------------------------

/**
 * File-based credential store.
 *
 * Reads and writes a JSON file at `filePath` (defaults to
 * `~/.franklin/auth.json`). Each call to `load()` / `save()` hits the
 * filesystem directly so that concurrent processes always see fresh data.
 */
export class AuthStore {
	constructor(readonly filePath: string = DEFAULT_AUTH_PATH) {}

	// -------------------------------------------------------------------------
	// Low-level persistence
	// -------------------------------------------------------------------------

	load(): AuthFile {
		if (!existsSync(this.filePath)) return {};
		try {
			return JSON.parse(readFileSync(this.filePath, 'utf-8')) as AuthFile;
		} catch {
			return {};
		}
	}

	save(data: AuthFile): void {
		mkdirSync(dirname(this.filePath), { recursive: true });
		writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
	}

	// -------------------------------------------------------------------------
	// Entry management
	// -------------------------------------------------------------------------

	getEntry(provider: string): AuthEntry | undefined {
		return this.load()[provider];
	}

	setApiKeyEntry(provider: string, entry: ApiKeyEntry): void {
		const data = this.load();
		if (data[provider]) {
			data[provider].apiKey = entry;
		} else {
			data[provider] = { apiKey: entry };
		}
		this.save(data);
	}

	setOAuthEntry(provider: string, entry: OAuthEntry): void {
		const data = this.load();
		if (data[provider]) {
			data[provider].oauth = entry;
		} else {
			data[provider] = { oauth: entry };
		}
		this.save(data);
	}

	setEntry(provider: string, entry: AuthEntry): void {
		const data = this.load();
		data[provider] = entry;
		this.save(data);
	}

	removeApiKeyEntry(provider: string): void {
		const data = this.load();
		if (data[provider]) {
			delete data[provider].apiKey;
			if (Object.keys(data[provider]).length === 0) delete data[provider];
			this.save(data);
		}
	}

	removeOAuthEntry(provider: string): void {
		const data = this.load();
		if (data[provider]) {
			delete data[provider].oauth;
			if (Object.keys(data[provider]).length === 0) delete data[provider];
			this.save(data);
		}
	}

	removeEntry(provider: string): void {
		const data = this.load();
		delete data[provider];
		this.save(data);
	}

	// -------------------------------------------------------------------------
	// API key resolution
	// -------------------------------------------------------------------------

	/**
	 * Returns the API key for a provider.
	 *
	 * - For `apiKey` entries: returns the stored key directly.
	 * - For `oauth` entries: calls `getOAuthApiKey` from pi-ai, which
	 *   automatically refreshes expired tokens. Refreshed credentials are
	 *   persisted back to disk.
	 *
	 * Returns `undefined` when no credentials are stored for the provider.
	 */
	async getApiKey(provider: string): Promise<string | undefined> {
		const entry = this.getEntry(provider);
		if (!entry) return undefined;

		// OAuth takes precedence, user can always clear them if they wish
		if (entry.oauth) {
			// Build the credentials map pi-ai expects
			const credMap: Record<string, OAuthCredentials> = {
				[provider]: entry.oauth.credentials,
			};

			const result = await getOAuthApiKey(provider as OAuthProviderId, credMap);
			if (!result) return undefined;

			// Always persist newCredentials — getOAuthApiKey may have refreshed the token.
			this.setOAuthEntry(provider, {
				type: 'oauth',
				credentials: result.newCredentials,
			});

			return result.apiKey;
		}

		return entry.apiKey?.key;
	}
}
