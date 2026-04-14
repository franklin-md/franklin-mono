import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import type {
	OAuthCredentials,
	OAuthLoginCallbacks,
} from '@mariozechner/pi-ai/oauth';

import type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthEntry,
} from './types.js';
import type { OAuthFlow } from './oauth-flow.js';
import type { Platform } from '../platform.js';
import { PersistedAuthEntriesStore } from './store.js';

export class AuthManager {
	private readonly store: PersistedAuthEntriesStore;

	constructor(private readonly platform: Platform) {
		this.store = new PersistedAuthEntriesStore(platform.filesystem);
	}

	async restore(): Promise<void> {
		await this.store.restore();
	}

	onAuthChange(
		listener: (
			provider: string,
			entry: AuthEntry | undefined,
		) => void | Promise<void>,
	): () => void {
		return this.store.subscribe((provider, entry) => {
			void listener(provider, entry);
		});
	}

	// -------------------------------------------------------------------------
	// Provider discovery
	// -------------------------------------------------------------------------

	async getOAuthProviders(): Promise<{ id: string; name: string }[]> {
		return await this.platform.ai.getOAuthProviders();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return await this.platform.ai.getApiKeyProviders();
	}

	// -------------------------------------------------------------------------
	// OAuth flow
	// -------------------------------------------------------------------------

	async flow(provider: string): Promise<OAuthFlow> {
		return this.platform.createFlow(provider);
	}

	async loginOAuth(
		provider: string,
		callbacks: OAuthLoginCallbacks,
	): Promise<void> {
		const flow = await this.flow(provider);
		const unsubAuth = flow.onAuth((info) => {
			callbacks.onAuth(info);
		});
		const unsubProgress = flow.onProgress((message) => {
			callbacks.onProgress?.(message);
		});
		const unsubPrompt = flow.onPrompt((prompt) => {
			void callbacks.onPrompt(prompt).then((value) => {
				return flow.respond(value);
			});
		});

		try {
			const credentials = await flow.login();
			this.setOAuthEntry(provider, {
				type: 'oauth',
				credentials,
			});
		} finally {
			unsubAuth();
			unsubProgress();
			unsubPrompt();
			await flow.dispose();
		}
	}

	// -------------------------------------------------------------------------
	// Entry management
	// -------------------------------------------------------------------------

	entries(): AuthEntries {
		return this.store.entries();
	}

	setApiKeyEntry(provider: string, entry: ApiKeyEntry): void {
		const current = this.store.get(provider);
		this.store.set(provider, { ...current, apiKey: entry });
	}

	setOAuthEntry(provider: string, entry: OAuthEntry): void {
		const current = this.store.get(provider);
		this.store.set(provider, { ...current, oauth: entry });
	}

	removeApiKeyEntry(provider: string): void {
		const current = this.store.get(provider);
		if (!current) return;
		const { apiKey: _, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			this.store.remove(provider);
		} else {
			this.store.set(provider, rest);
		}
	}

	removeOAuthEntry(provider: string): void {
		const current = this.store.get(provider);
		if (!current) return;
		const { oauth: _, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			this.store.remove(provider);
		} else {
			this.store.set(provider, rest);
		}
	}

	// -------------------------------------------------------------------------
	// API key resolution
	// -------------------------------------------------------------------------

	async getApiKey(provider: string): Promise<string | undefined> {
		const entry = this.store.get(provider);
		if (!entry) return undefined;

		if (entry.oauth) {
			const credMap: Record<string, OAuthCredentials> = {
				[provider]: entry.oauth.credentials,
			};

			const result = await getOAuthApiKey(provider, credMap);
			if (!result) return undefined;

			if (!sameCredentials(entry.oauth.credentials, result.newCredentials)) {
				this.setOAuthEntry(provider, {
					type: 'oauth',
					credentials: result.newCredentials,
				});
			}

			return result.apiKey;
		}

		return entry.apiKey?.key;
	}
}

function sameCredentials(a: OAuthCredentials, b: OAuthCredentials): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
