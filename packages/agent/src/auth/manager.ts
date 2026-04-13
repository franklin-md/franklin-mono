import {
	getOAuthProvider,
	type OAuthLoginCallbacks,
} from '@mariozechner/pi-ai/oauth';
import type { Filesystem } from '@franklin/lib';

import type {
	ApiKeyEntry,
	AuthChangeListener,
	AuthFile,
	IAuthFlow,
} from './types.js';
import { AuthStore } from './store.js';
import { OAuthFlow } from './oauth-flow.js';

interface AuthDependencies {
	filesystem: Filesystem;
	ai: {
		getOAuthProviders(): Promise<{ id: string; name: string }[]>;
		getApiKeyProviders(): Promise<string[]>;
	};
}

export class AuthManager {
	private readonly listeners = new Set<AuthChangeListener>();
	private readonly store: AuthStore;
	private readonly ai: AuthDependencies['ai'];

	constructor(deps: AuthDependencies) {
		this.store = new AuthStore(deps.filesystem);
		this.ai = deps.ai;
	}

	onAuthChange(listener: AuthChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	// TODO Right place?
	async getOAuthProviders(): Promise<{ id: string; name: string }[]> {
		return await this.ai.getOAuthProviders();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return await this.ai.getApiKeyProviders();
	}

	async flow(provider: string): Promise<IAuthFlow> {
		return new OAuthFlow((callbacks) => this.loginOAuth(provider, callbacks));
	}

	async load(): Promise<AuthFile> {
		return this.store.load();
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

	async removeOAuthEntry(provider: string): Promise<void> {
		await this.store.removeOAuthEntry(provider);
		await this.notify(provider);
	}

	private async loginOAuth(
		provider: string,
		callbacks: OAuthLoginCallbacks,
	): Promise<void> {
		// Rely on platform to do this.
		const oauthProvider = getOAuthProvider(provider);
		if (!oauthProvider) {
			throw new Error(`OAuth provider "${provider}" not found`);
		}
		const credentials = await oauthProvider.login(callbacks);
		await this.store.setOAuthEntry(provider, {
			type: 'oauth',
			credentials,
		});
		await this.notify(provider);
	}

	private async notify(provider: string): Promise<void> {
		const authKey = await this.store.getApiKey(provider);
		for (const listener of this.listeners) {
			await listener(provider, authKey);
		}
	}
}
