import type { OAuthLoginCallbacks } from '@mariozechner/pi-ai/oauth';

import type {
	ApiKeyEntry,
	AuthChangeListener,
	AuthFile,
	OAuthEntry,
} from './types.js';
import type { OAuthFlow } from './oauth-flow.js';
import type { Platform } from '../platform.js';
import { AuthStore } from './store.js';

export class AuthManager {
	private readonly listeners = new Set<AuthChangeListener>();
	private readonly store: AuthStore;

	constructor(private readonly platform: Platform) {
		this.store = new AuthStore(platform.filesystem);
		this.store.onChange(async (provider, entry) => {
			for (const listener of this.listeners) {
				await listener(provider, entry);
			}
		});
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
			await this.setOAuthEntry(provider, {
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

	async load(): Promise<AuthFile> {
		return this.store.load();
	}

	async getApiKey(provider: string): Promise<string | undefined> {
		return this.store.getApiKey(provider);
	}

	async setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void> {
		await this.store.setApiKeyEntry(provider, entry);
	}

	async setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void> {
		await this.store.setOAuthEntry(provider, entry);
	}

	async removeApiKeyEntry(provider: string): Promise<void> {
		await this.store.removeApiKeyEntry(provider);
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		await this.store.removeOAuthEntry(provider);
	}
}
