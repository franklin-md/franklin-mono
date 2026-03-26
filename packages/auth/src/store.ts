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

	async load(): Promise<AuthFile> {
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

	async getEntry(provider: string): Promise<AuthEntry | undefined> {
		return (await this.load())[provider];
	}

	async setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			data[provider].apiKey = entry;
		} else {
			data[provider] = { apiKey: entry };
		}
		this.save(data);
	}

	async setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			data[provider].oauth = entry;
		} else {
			data[provider] = { oauth: entry };
		}
		this.save(data);
	}

	async setEntry(provider: string, entry: AuthEntry): Promise<void> {
		const data = await this.load();
		data[provider] = entry;
		this.save(data);
	}

	async removeApiKeyEntry(provider: string): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			delete data[provider].apiKey;
			if (Object.keys(data[provider]).length === 0) delete data[provider];
			this.save(data);
		}
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			delete data[provider].oauth;
			if (Object.keys(data[provider]).length === 0) delete data[provider];
			this.save(data);
		}
	}

	async removeEntry(provider: string): Promise<void> {
		const data = await this.load();
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
		const entry = await this.getEntry(provider);
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
			await this.setOAuthEntry(provider, {
				type: 'oauth',
				credentials: result.newCredentials,
			});

			return result.apiKey;
		}

		return entry.apiKey?.key;
	}
}
