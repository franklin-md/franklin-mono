/* eslint-disable @typescript-eslint/no-dynamic-delete */

import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

import type { ApiKeyEntry, AuthEntry, AuthFile, OAuthEntry } from './types.js';
import type { Platform } from '@franklin/agent';
import type { Filesystem } from '@franklin/lib';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

export const DEFAULT_AUTH_PATH = 'auth.json';

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
	private readonly filesystem: Filesystem;
	constructor(platform: Platform) {
		this.filesystem = platform.filesystem;
	}

	// -------------------------------------------------------------------------
	// Low-level persistence
	// -------------------------------------------------------------------------

	async load(): Promise<AuthFile> {
		return this.filesystem
			.readFile(DEFAULT_AUTH_PATH)
			.then((data) => {
				// TODO: Ensure that this is utf-8?
				return JSON.parse(data.toString()) as AuthFile;
			})
			.catch(() => ({}));
	}

	// TODO: async
	save(data: AuthFile): void {
		void this.filesystem.writeFile(
			DEFAULT_AUTH_PATH,
			JSON.stringify(data, null, 2),
		);
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
		const current = data[provider];
		if (current) {
			delete current.apiKey;
			if (Object.keys(current).length === 0) {
				delete data[provider];
			}
			this.save(data);
		}
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		const data = await this.load();
		const current = data[provider];
		if (current) {
			delete current.oauth;
			if (Object.keys(current).length === 0) {
				delete data[provider];
			}
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

			const result = await getOAuthApiKey(provider, credMap);
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
