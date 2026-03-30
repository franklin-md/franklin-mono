import type {
	ApiKeyEntry,
	AuthChangeListener,
	AuthEntry,
	AuthFile,
	IAuthManager,
	OAuthEntry,
	OAuthLoginCallbacks,
} from '@franklin/agent';

// ---------------------------------------------------------------------------
// AuthBridge — matches the auth slice exposed by the preload
// ---------------------------------------------------------------------------

export interface AuthBridge {
	getProviders(): Promise<Array<{ id: string; name: string }>>;
	getCanonicalProviders(): Promise<string[]>;
	load(): Promise<AuthFile>;
	getApiKey(provider: string): Promise<string | undefined>;
	setEntry(provider: string, entry: AuthEntry): Promise<void>;
	removeEntry(provider: string): Promise<void>;
	openExternal(url: string): Promise<void>;

	startLogin(
		provider: string,
		flowId: string,
	): Promise<{ success: boolean; error?: string }>;
	sendPromptResponse(flowId: string, value: string): void;
	onOAuthAuth(
		cb: (flowId: string, info: { url: string; instructions?: string }) => void,
	): () => void;
	onOAuthProgress(cb: (flowId: string, message: string) => void): () => void;
	onOAuthPrompt(
		cb: (
			flowId: string,
			prompt: { message: string; placeholder?: string; allowEmpty?: boolean },
		) => void,
	): () => void;
	onAuthChange(
		cb: (provider: string, authKey: string | undefined) => void,
	): () => void;
}

// ---------------------------------------------------------------------------
// ElectronAuthManager
// ---------------------------------------------------------------------------

/**
 * Renderer-side implementation of `IAuthManager` that proxies all reads and
 * writes to the main process via the auth IPC bridge.
 *
 * @example
 * ```ts
 * const manager = new ElectronAuthManager(window.__franklinBridge.auth);
 * await manager.initialize();
 * // pass to <AuthProvider store={manager}>
 * ```
 */
export class ElectronAuthManager implements IAuthManager {
	constructor(private readonly bridge: AuthBridge) {}

	/** Load initial state from main. Must be called before passing to `<AuthProvider>`. */
	async initialize(): Promise<void> {
		return;
	}

	async refresh(): Promise<void> {
		return;
	}

	async load(): Promise<AuthFile> {
		return this.bridge.load();
	}

	async getEntry(provider: string): Promise<AuthEntry | undefined> {
		return (await this.bridge.load())[provider];
	}

	async setEntry(provider: string, entry: AuthEntry): Promise<void> {
		await this.bridge.setEntry(provider, entry);
	}

	async removeEntry(provider: string): Promise<void> {
		await this.bridge.removeEntry(provider);
	}

	async setApiKeyEntry(provider: string, entry: ApiKeyEntry): Promise<void> {
		const nextEntry: AuthEntry = {
			...((await this.getEntry(provider)) ?? {}),
			apiKey: entry,
		};
		await this.bridge.setEntry(provider, nextEntry);
	}

	async removeApiKeyEntry(provider: string): Promise<void> {
		const current = await this.getEntry(provider);
		if (!current) return;

		const { apiKey: _apiKey, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			await this.bridge.removeEntry(provider);
			return;
		}

		await this.bridge.setEntry(provider, rest);
	}

	async setOAuthEntry(provider: string, entry: OAuthEntry): Promise<void> {
		const nextEntry: AuthEntry = {
			...((await this.getEntry(provider)) ?? {}),
			oauth: entry,
		};
		await this.bridge.setEntry(provider, nextEntry);
	}

	async getApiKey(provider: string): Promise<string | undefined> {
		return this.bridge.getApiKey(provider);
	}

	async loginOAuth(
		provider: string,
		callbacks: OAuthLoginCallbacks,
	): Promise<void> {
		const loginOAuth = createIpcLoginOAuth(this.bridge);
		await loginOAuth(provider, callbacks);
	}

	async setApiKey(provider: string, key: string): Promise<void> {
		await this.setApiKeyEntry(provider, { type: 'apiKey', key });
	}

	async removeOAuthEntry(provider: string): Promise<void> {
		const current = await this.getEntry(provider);
		if (!current) return;

		const { oauth: _oauth, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			await this.bridge.removeEntry(provider);
			return;
		}

		await this.bridge.setEntry(provider, rest);
	}

	onAuthChange(listener: AuthChangeListener): () => void {
		return this.bridge.onAuthChange((provider, authKey) => {
			void listener(provider, authKey);
		});
	}

	async getOAuthProviders(): Promise<{ id: string; name: string }[]> {
		return this.bridge.getProviders();
	}

	async getApiKeyProviders(): Promise<string[]> {
		return this.bridge.getCanonicalProviders();
	}
}

// ---------------------------------------------------------------------------
// createIpcLoginOAuth
// ---------------------------------------------------------------------------

/**
 * Returns a login function compatible with `OAuthPanel.onLogin` that runs
 * the OAuth flow in the main process and drives the UI callbacks from
 * renderer-side IPC events.
 *
 * The caller generates a `flowId` (via `crypto.randomUUID()`) so that events
 * emitted by main during the flow can be matched to this specific invocation.
 */
export function createIpcLoginOAuth(
	bridge: AuthBridge,
): (providerId: string, callbacks: OAuthLoginCallbacks) => Promise<void> {
	return async (providerId, callbacks) => {
		const flowId = crypto.randomUUID();

		const unsubAuth = bridge.onOAuthAuth((fId, info) => {
			if (fId === flowId) callbacks.onAuth(info);
		});

		const unsubProgress = bridge.onOAuthProgress((fId, message) => {
			if (fId === flowId) callbacks.onProgress?.(message);
		});

		const unsubPrompt = bridge.onOAuthPrompt((fId, prompt) => {
			if (fId !== flowId) return;
			void callbacks.onPrompt(prompt).then((value) => {
				bridge.sendPromptResponse(flowId, value);
			});
		});

		try {
			const result = await bridge.startLogin(providerId, flowId);
			if (!result.success) throw new Error(result.error ?? 'Login failed');
		} finally {
			unsubAuth();
			unsubProgress();
			unsubPrompt();
		}
	};
}
