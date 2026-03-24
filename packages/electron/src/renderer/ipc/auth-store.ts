import type { ApiKeyEntry, AuthEntry, AuthFile, IAuthStore, OAuthEntry, OAuthLoginCallbacks } from '@franklin/auth';

// ---------------------------------------------------------------------------
// AuthBridge — matches the auth slice exposed by the preload
// ---------------------------------------------------------------------------

export interface AuthBridge {
	getProviders(): Promise<Array<{ id: string; name: string }>>;
	getCanonicalProviders(): Promise<string[]>;
	load(): Promise<AuthFile>;
	setEntry(provider: string, entry: AuthEntry): Promise<void>;
	removeEntry(provider: string): Promise<void>;
	openExternal(url: string): Promise<void>;

	startLogin(provider: string, flowId: string): Promise<{ success: boolean; error?: string }>;
	sendPromptResponse(flowId: string, value: string): void;
	onOAuthAuth(cb: (flowId: string, info: { url: string; instructions?: string }) => void): () => void;
	onOAuthProgress(cb: (flowId: string, message: string) => void): () => void;
	onOAuthPrompt(cb: (flowId: string, prompt: { message: string; placeholder?: string; allowEmpty?: boolean }) => void): () => void;
}

// ---------------------------------------------------------------------------
// ElectronAuthStore
// ---------------------------------------------------------------------------

/**
 * Renderer-side implementation of `IAuthStore` that proxies all reads and
 * writes to the main process via the auth IPC bridge.
 *
 * State is loaded once on `initialize()` and kept in a local cache that is
 * updated optimistically on every mutation — no disk reads happen during renders.
 *
 * @example
 * ```ts
 * const store = new ElectronAuthStore(window.__franklinBridge.auth);
 * await store.initialize();
 * // pass to <AuthProvider store={store}>
 * ```
 */
export class ElectronAuthStore implements IAuthStore {
	private cache: AuthFile = {};

	constructor(private readonly bridge: AuthBridge) {}

	/** Load initial state from main. Must be called before passing to `<AuthProvider>`. */
	async initialize(): Promise<void> {
		this.cache = await this.bridge.load();
	}

	async refresh(): Promise<void> {
		this.cache = await this.bridge.load();
	}

	/** Synchronous read from the local cache — never hits disk. */
	load(): AuthFile {
		return this.cache;
	}

	setEntry(provider: string, entry: AuthEntry): void {
		this.cache = { ...this.cache, [provider]: entry };
		void this.bridge.setEntry(provider, entry);
	}

	removeEntry(provider: string): void {
		const next = { ...this.cache };
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete next[provider];
		this.cache = next;
		void this.bridge.removeEntry(provider);
	}
	setApiKeyEntry(provider: string, entry: ApiKeyEntry): void {
		const nextEntry: AuthEntry = {
			...(this.cache[provider] ?? {}),
			apiKey: entry,
		};

		this.cache = { ...this.cache, [provider]: nextEntry };
		void this.bridge.setEntry(provider, nextEntry);
	}

	removeApiKeyEntry(provider: string): void {
		const current = this.cache[provider];
		if (!current) return;

		const { apiKey: _apiKey, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			const next = { ...this.cache };
			delete next[provider];
			this.cache = next;
			void this.bridge.removeEntry(provider);
			return;
		}

		this.cache = { ...this.cache, [provider]: rest };
		void this.bridge.setEntry(provider, rest);
	}

	setOAuthEntry(provider: string, entry: OAuthEntry): void {
		const nextEntry: AuthEntry = {
			...(this.cache[provider] ?? {}),
			oauth: entry,
		};

		this.cache = { ...this.cache, [provider]: nextEntry };
		void this.bridge.setEntry(provider, nextEntry);
	}

	removeOAuthEntry(provider: string): void {
		const current = this.cache[provider];
		if (!current) return;

		const { oauth: _oauth, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			const next = { ...this.cache };
			delete next[provider];
			this.cache = next;
			void this.bridge.removeEntry(provider);
			return;
		}

		this.cache = { ...this.cache, [provider]: rest };
		void this.bridge.setEntry(provider, rest);
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
