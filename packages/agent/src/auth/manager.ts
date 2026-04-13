import type {
	ApiKeyEntry,
	AuthChangeListener,
	AuthFile,
	OAuthEntry,
} from './types.js';
import type { OAuthFlow } from './oauth-flow.js';
import type { Platform } from '../platform.js';
import { AuthStore } from './store.js';

type AuthDependencies = Pick<Platform, 'ai' | 'createFlow' | 'filesystem'>;

export class AuthManager {
	private readonly listeners = new Set<AuthChangeListener>();
	private readonly store: AuthStore;
	private readonly ai: AuthDependencies['ai'];
	private readonly createFlowFn: AuthDependencies['createFlow'];

	constructor(deps: AuthDependencies) {
		this.store = new AuthStore(deps.filesystem);
		this.ai = deps.ai;
		this.createFlowFn = deps.createFlow;
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
		return await this.ai.getOAuthProviders();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return await this.ai.getApiKeyProviders();
	}

	async flow(provider: string): Promise<OAuthFlow> {
		return this.createFlowFn(provider);
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
