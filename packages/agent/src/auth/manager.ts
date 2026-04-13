import type {
	ApiKeyEntry,
	AppAuth,
	AuthChangeListener,
	AuthFile,
	IAuthFlow,
} from './types.js';
import type { Platform } from '../platform.js';
import { AuthStore } from './store.js';

type AuthDependencies = Pick<Platform, 'ai' | 'createFlow' | 'filesystem'>;

export class AuthManager implements AppAuth {
	private readonly listeners = new Set<AuthChangeListener>();
	private readonly store: AuthStore;
	private readonly ai: AuthDependencies['ai'];
	private readonly createFlowFn: AuthDependencies['createFlow'];

	constructor(deps: AuthDependencies) {
		this.store = new AuthStore(deps.filesystem);
		this.ai = deps.ai;
		this.createFlowFn = deps.createFlow;
		this.store.onChange(async (provider) => {
			for (const listener of this.listeners) {
				await listener(provider);
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

	async flow(provider: string): Promise<IAuthFlow> {
		const flow = await this.createFlowFn(provider);
		return {
			onAuth: (listener) => flow.onAuth(listener),
			onProgress: (listener) => flow.onProgress(listener),
			onPrompt: (listener) => flow.onPrompt(listener),
			respond: (value) => flow.respond(value),
			login: async () => {
				const credentials = await flow.login();
				await this.store.setOAuthEntry(provider, {
					type: 'oauth',
					credentials,
				});
			},
			dispose: () => flow.dispose(),
		};
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

	async removeApiKeyEntry(provider: string): Promise<void> {
		await this.store.removeApiKeyEntry(provider);
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		await this.store.removeOAuthEntry(provider);
	}
}
