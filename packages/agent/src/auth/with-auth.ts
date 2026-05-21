import type {
	CoreRuntime,
	CoreSignature,
	CoreState,
	CoreStateModule,
} from '../modules/core/index.js';
import { applyStep } from '@franklin/extensibility';
import { liftCompilerTransform as liftStateCompilerTransform } from '../modules/state/index.js';
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

// TODO: Can we not use the provider that has been set already during the compile step? (given that should populate?)
// That would simplify this to just a CompilerStep

function createAuthCompilerTransform(auth: AuthManager) {
	return (state: CoreState) =>
		applyStep<CoreSignature, CoreRuntime, CoreRuntime>(async (runtime) => {
			// Install setLLMConfig wrapper to auto-resolve auth when provider is set.
			const originalSetLLMConfig = runtime.setLLMConfig.bind(runtime);
			runtime.setLLMConfig = async (config) => {
				const currentProvider =
					runtime.session.getSnapshot().llmConfig.provider;
				const nextProvider = config.provider;
				const providerChanged =
					nextProvider !== undefined && nextProvider !== currentProvider;

				if (providerChanged && !('apiKey' in config)) {
					// Auth resolution is best-effort: setContext must not be blocked
					// by credential refresh failures (e.g. provider OAuth refresh
					// throwing). A missing apiKey surfaces at prompt time via
					// StopCode.AuthKeyNotSpecified. We must still write
					// `apiKey: undefined` explicitly so the previous provider's key
					// does not survive config-merge on provider switch.
					let apiKey: string | undefined;
					try {
						apiKey = await auth.getApiKey(nextProvider);
					} catch {
						// swallow; proceed without apiKey
					}
					config = { ...config, apiKey };
				}
				return originalSetLLMConfig(config);
			};

			// Initial login resolves credentials for the configured provider,
			// or no-ops if none is set.
			await reconnectAgent(runtime, state, auth);

			// Live credential sync pushes new keys when this runtime's provider changes.
			const unsubscribe = auth.onAuthChange((provider) => {
				void (async () => {
					if (runtime.session.getSnapshot().llmConfig.provider !== provider) {
						return;
					}
					await authenticateAgent(runtime, provider, auth);
				})();
			});

			// Clean up subscription on dispose.
			const originalDispose = runtime.dispose.bind(runtime);
			runtime.dispose = async () => {
				unsubscribe();
				return originalDispose();
			};
			return runtime;
		});
}

/**
 * Wrap a core state module so that every compiled runtime is automatically
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
export function withAuth(
	module: CoreStateModule,
	auth: AuthManager,
): CoreStateModule {
	return liftStateCompilerTransform(createAuthCompilerTransform(auth))(module);
}
