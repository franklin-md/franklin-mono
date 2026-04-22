import { createObserver } from '@franklin/lib';

import { OAuthClient } from './oauth-client.js';
import { createBuiltInOAuthClient } from './specs/index.js';
import type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
	OAuthLoginCallbacks,
	OAuthEntry,
} from './types.js';
import type { OAuthFlow } from './oauth-flow.js';
import type { Platform } from '../platform.js';
import type { AuthStore } from './store.js';

export class AuthManager {
	private readonly observer = createObserver<[string, AuthEntry | undefined]>();
	private readonly oauthClient: OAuthClient;

	constructor(
		private readonly platform: Platform,
		private readonly store: AuthStore,
		oauthClient?: OAuthClient,
	) {
		this.oauthClient =
			oauthClient ?? createBuiltInOAuthClient(platform.os.net);
	}

	async restore(): Promise<void> {
		await this.store.restore();
	}

	onAuthChange(
		listener: (provider: string, entry: AuthEntry | undefined) => void,
	): () => void {
		return this.observer.subscribe(listener);
	}

	// -------------------------------------------------------------------------
	// Provider discovery
	// -------------------------------------------------------------------------

	getOAuthProviders(): { id: string; name: string }[] {
		return this.oauthClient.providers();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return await this.platform.ai.getApiKeyProviders();
	}

	// -------------------------------------------------------------------------
	// OAuth flow
	// -------------------------------------------------------------------------

	flow(provider: string): OAuthFlow {
		return this.oauthClient.createFlow(provider);
	}

	async loginOAuth(
		provider: string,
		callbacks: OAuthLoginCallbacks,
	): Promise<void> {
		const flow = this.flow(provider);
		const unsubAuth = flow.onAuth((info) => {
			callbacks.onAuth(info);
		});
		const unsubProgress = flow.onProgress((message) => {
			callbacks.onProgress?.(message);
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
			await flow.dispose();
		}
	}

	// -------------------------------------------------------------------------
	// Entry management
	// -------------------------------------------------------------------------

	entries(): AuthEntries {
		return { ...this.store.get() };
	}

	setApiKeyEntry(provider: string, entry: ApiKeyEntry): void {
		const next = {
			...(this.getEntry(provider) ?? {}),
			apiKey: entry,
		};
		this.updateEntry(provider, () => next);
		this.notifyChange(provider, next);
	}

	setOAuthEntry(provider: string, entry: OAuthEntry): void {
		const next = {
			...(this.getEntry(provider) ?? {}),
			oauth: entry,
		};
		this.updateEntry(provider, () => next);
		this.notifyChange(provider, next);
	}

	removeApiKeyEntry(provider: string): void {
		const current = this.getEntry(provider);
		if (!current) return;
		const { apiKey: _, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			this.removeEntry(provider);
			this.notifyChange(provider, undefined);
		} else {
			this.updateEntry(provider, () => rest);
			this.notifyChange(provider, rest);
		}
	}

	removeOAuthEntry(provider: string): void {
		const current = this.getEntry(provider);
		if (!current) return;
		const { oauth: _, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			this.removeEntry(provider);
			this.notifyChange(provider, undefined);
		} else {
			this.updateEntry(provider, () => rest);
			this.notifyChange(provider, rest);
		}
	}

	// -------------------------------------------------------------------------
	// API key resolution
	// -------------------------------------------------------------------------

	async getApiKey(provider: string): Promise<string | undefined> {
		const entry = this.getEntry(provider);
		if (!entry) return undefined;

		if (entry.oauth) {
			let credentials = entry.oauth.credentials;
			if (Date.now() >= credentials.expires) {
				credentials = await this.oauthClient.refresh(provider, credentials);
				this.setOAuthEntry(provider, {
					type: 'oauth',
					credentials,
				});
			}
			return this.oauthClient.getApiKey(provider, credentials);
		}

		return entry.apiKey?.key;
	}

	private getEntry(provider: string): AuthEntry | undefined {
		return this.store.get()[provider];
	}

	private updateEntry(
		provider: string,
		recipe: (current: AuthEntry | undefined) => AuthEntry,
	): void {
		this.store.set((entries) => ({
			...entries,
			[provider]: recipe(entries[provider]),
		}));
	}

	private removeEntry(provider: string): void {
		this.store.set((entries) => {
			if (!(provider in entries)) return entries;
			const { [provider]: _, ...rest } = entries;
			return rest;
		});
	}

	private notifyChange(provider: string, entry: AuthEntry | undefined): void {
		this.observer.notify(provider, entry);
	}
}
