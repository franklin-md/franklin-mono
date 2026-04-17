import type { CoreSystem, CoreRuntime, CoreState } from '@franklin/extensions';
import { withSetup } from '@franklin/extensions';
import type { AuthManager } from './manager.js';

/**
 * Push the stored credentials for `provider` into the runtime.
 *
 * Fetches the API key from the auth manager and calls `setLLMConfig`
 * with the resolved `{ provider, apiKey }`. If no key is stored,
 * `apiKey` is passed through as `undefined` — this is how revocation
 * propagates to the runtime.
 */
export async function authenticateAgent(
	runtime: CoreRuntime,
	provider: string,
	auth: AuthManager,
): Promise<void> {
	const apiKey = await auth.getApiKey(provider);
	await runtime.setLLMConfig({ provider, apiKey });
}

/**
 * Reconnect a runtime to the auth manager using the provider
 * configured in its state. No-ops if the state has no provider set.
 */
export async function reconnectAgent(
	runtime: CoreRuntime,
	state: CoreState,
	auth: AuthManager,
): Promise<void> {
	const provider = state.core.llmConfig.provider;
	if (!provider) return;
	await authenticateAgent(runtime, provider, auth);
}

/**
 * Wrap a core system so that every compiled runtime is automatically
 * authenticated at build time and kept in sync with credential changes.
 *
 * Three behaviors:
 * 1. **Initial login** — resolves the apiKey for the configured provider
 *    when the runtime is first built.
 * 2. **Auto-auth** — intercepts `setLLMConfig` calls. When a provider is
 *    specified without an apiKey, resolves the key from the auth
 *    manager before passing through.
 * 3. **Live sync** — subscribes to credential changes and pushes new
 *    keys to the runtime when its provider's credentials change.
 *    Unsubscribes on dispose.
 */
export function withAuth(system: CoreSystem, auth: AuthManager): CoreSystem {
	return withSetup(system, async (runtime, state) => {
		// Install setLLMConfig wrapper to auto-resolve auth when provider is set.
		const originalSetLLMConfig = runtime.setLLMConfig.bind(runtime);
		runtime.setLLMConfig = async (config) => {
			if (config.provider && !config.apiKey) {
				const apiKey = await auth.getApiKey(config.provider);
				if (apiKey) {
					config = { ...config, apiKey };
				}
			}
			return originalSetLLMConfig(config);
		};

		// Initial login — resolves credentials for the configured provider,
		// or no-ops if none is set.
		await reconnectAgent(runtime, state, auth);

		// Live credential sync — push new keys when this runtime's provider changes.
		const unsubscribe = auth.onAuthChange((provider) => {
			void (async () => {
				const currentState = await runtime.state();
				if (currentState.core.llmConfig.provider !== provider) return;
				await authenticateAgent(runtime, provider, auth);
			})();
		});

		// Clean up subscription on dispose.
		const originalDispose = runtime.dispose.bind(runtime);
		runtime.dispose = async () => {
			unsubscribe();
			return originalDispose();
		};
	});
}
