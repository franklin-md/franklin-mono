import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import { createObserver } from '@franklin/lib';
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
import { createAuthStore, type AuthStore } from './store.js';

export class AuthManager {
	private readonly store: AuthStore;
	private readonly observer = createObserver<[string, AuthEntry | undefined]>();

	constructor(private readonly platform: Platform) {
		this.store = createAuthStore(platform.filesystem);
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
		return this.observer.subscribe((provider, entry) => {
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

function sameCredentials(a: OAuthCredentials, b: OAuthCredentials): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
