import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import type { OAuthCredentials, OAuthProviderId } from '@mariozechner/pi-ai/oauth';

import type { AuthEntry, AuthFile } from './types.js';

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

	setEntry(provider: string, entry: AuthEntry): void {
		const data = this.load();
		data[provider] = entry;
		this.save(data);
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

		if (entry.type === 'apiKey') {
			return entry.key;
		}

		// Build the credentials map pi-ai expects
		const credMap: Record<string, OAuthCredentials> = {
			[provider]: entry.credentials,
		};

		const result = await getOAuthApiKey(provider as OAuthProviderId, credMap);
		if (!result) return undefined;

		// Always persist newCredentials — getOAuthApiKey may have refreshed the token.
		this.setEntry(provider, { type: 'oauth', credentials: result.newCredentials });

		return result.apiKey;
	}
}
