/* eslint-disable @typescript-eslint/no-dynamic-delete */

import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import type { OAuthCredentials } from '@mariozechner/pi-ai/oauth';

import type { Filesystem } from '@franklin/lib';
import type { ApiKeyEntry, AuthEntry, AuthFile, OAuthEntry } from './types.js';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

const DEFAULT_AUTH_PATH = 'auth.json';

type AuthStoreChangeListener = (
	provider: string,
	entry: AuthEntry | undefined,
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// AuthStore
// ---------------------------------------------------------------------------

// TODO: AuthStore should follow a similar pattern to SessionCollection, i.e.
// In memory concrete type with a decorator class that adds persistence.

/**
 * File-based credential store.
 *
 * Reads and writes a JSON file at `filePath` (defaults to
 * `~/.franklin/auth.json`). Each call to `load()` / `save()` hits the
 * filesystem directly so that concurrent processes always see fresh data.
 */
export class AuthStore {
	private readonly filesystem: Filesystem;
	private readonly listeners = new Set<AuthStoreChangeListener>();

	constructor(filesystem: Filesystem) {
		this.filesystem = filesystem;
	}

	onChange(listener: AuthStoreChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
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

	private async save(data: AuthFile): Promise<void> {
		await this.filesystem.writeFile(
			DEFAULT_AUTH_PATH,
			JSON.stringify(data, null, 2),
		);
	}

	// -------------------------------------------------------------------------
	// Entry management
	// -------------------------------------------------------------------------

	async setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			data[provider].apiKey = entry;
		} else {
			data[provider] = { apiKey: entry };
		}
		await this.save(data);
		await this.notify(provider, data[provider]);
	}

	async setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void> {
		const data = await this.load();
		if (data[provider]) {
			data[provider].oauth = entry;
		} else {
			data[provider] = { oauth: entry };
		}
		await this.save(data);
		await this.notify(provider, data[provider]);
	}

	async removeApiKeyEntry(provider: string): Promise<void> {
		const data = await this.load();
		const current = data[provider];
		if (current) {
			delete current.apiKey;
			if (Object.keys(current).length === 0) {
				delete data[provider];
			}
			await this.save(data);
			await this.notify(provider, data[provider]);
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
			await this.save(data);
			await this.notify(provider, data[provider]);
		}
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
		const entry = (await this.load())[provider];
		if (!entry) return undefined;

		// OAuth takes precedence, user can always clear them if they wish
		if (entry.oauth) {
			// Build the credentials map pi-ai expects
			const credMap: Record<string, OAuthCredentials> = {
				[provider]: entry.oauth.credentials,
			};

			const result = await getOAuthApiKey(provider, credMap);
			if (!result) return undefined;

			if (!sameCredentials(entry.oauth.credentials, result.newCredentials)) {
				await this.setOAuthEntry(provider, {
					type: 'oauth',
					credentials: result.newCredentials,
				});
			}

			return result.apiKey;
		}

		return entry.apiKey?.key;
	}

	private async notify(
		provider: string,
		entry: AuthEntry | undefined,
	): Promise<void> {
		for (const listener of this.listeners) {
			await listener(provider, entry);
		}
	}
}

function sameCredentials(a: OAuthCredentials, b: OAuthCredentials): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
