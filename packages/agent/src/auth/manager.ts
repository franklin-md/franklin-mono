import type {
	OAuthLoginCallbacks,
	OAuthProviderId,
} from '@mariozechner/pi-ai/oauth';

import type {
	ApiKeyEntry,
	AuthChangeListener,
	AuthEntry,
	AuthFile,
	IAuthManager,
	OAuthEntry,
} from './types.js';
import { AuthStore } from './store.js';
import type { Platform } from '@franklin/agent';

export class AuthManager implements IAuthManager {
	private readonly listeners = new Set<AuthChangeListener>();
	private readonly store: AuthStore;
	private readonly platform: Platform;

	constructor(platform: Platform) {
		this.store = new AuthStore(platform);
		this.platform = platform;
	}

	onAuthChange(listener: AuthChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	// TODO Right place?
	async getOAuthProviders(): Promise<{ id: string; name: string }[]> {
		return await this.platform.ai.getOAuthProviders();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return await this.platform.ai.getApiKeyProviders();
	}

	async load(): Promise<AuthFile> {
		return this.store.load();
	}

	async getEntry(provider: string): Promise<AuthEntry | undefined> {
		return this.store.getEntry(provider);
	}

	async getApiKey(provider: string): Promise<string | undefined> {
		return this.store.getApiKey(provider);
	}

	async setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void> {
		await this.store.setApiKeyEntry(provider, entry);
		await this.notify(provider);
	}

	async removeApiKeyEntry(provider: string): Promise<void> {
		await this.store.removeApiKeyEntry(provider);
		await this.notify(provider);
	}

	async setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void> {
		await this.store.setOAuthEntry(provider, entry);
		await this.notify(provider);
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		await this.store.removeOAuthEntry(provider);
		await this.notify(provider);
	}

	async setEntry(provider: string, entry: AuthEntry): Promise<void> {
		await this.store.setEntry(provider, entry);
		await this.notify(provider);
	}

	async removeEntry(provider: string): Promise<void> {
		await this.store.removeEntry(provider);
		await this.notify(provider);
	}

	async loginOAuth(
		provider: OAuthProviderId,
		callbacks: OAuthLoginCallbacks,
	): Promise<void> {
		// TODO: Implement
	}

	async setApiKey(provider: string, key: string): Promise<void> {
		await this.setApiKeyEntry(provider, { type: 'apiKey', key });
	}

	private async notify(provider: string): Promise<void> {
		const authKey = await this.store.getApiKey(provider);
		for (const listener of this.listeners) {
			await listener(provider, authKey);
		}
	}
}
