import type {
	CoreRuntime,
	CoreSignature,
	CoreState,
} from '../modules/core/index.js';
import type { CoreStateModule } from '../modules/core/module/state-module.js';
import { applyStep } from '@franklin/extensibility';
import { liftCompilerTransform as liftStateCompilerTransform } from '../modules/state/index.js';
import { explainMissingKey } from './explain-missing-key.js';
import type { AuthManager } from './manager.js';

// The latest key-resolution failure for a runtime's provider, if any.
type KeyFailure = { current?: unknown };

/**
 * Resolve the stored API key for `provider`, best-effort.
 *
 * Auth resolution must never block runtime construction or config
 * writes: credential refresh can fail (e.g. provider OAuth refresh
 * throwing `refresh_token_reused`). On failure this resolves to
 * `undefined` — a missing apiKey surfaces at prompt time via
 * StopCode.AuthKeyNotSpecified, where the user can re-authenticate.
 * The failure is recorded so that turn end can say why.
 */
async function resolveApiKey(
	auth: AuthManager,
	provider: string,
	failure?: KeyFailure,
): Promise<string | undefined> {
	try {
		const apiKey = await auth.getApiKey(provider);
		if (failure) failure.current = undefined;
		return apiKey;
	} catch (error) {
		if (failure) failure.current = error;
		return undefined;
	}
}

/**
 * Push the stored credentials for `provider` into the runtime.
 *
 * Fetches the API key from the auth manager and calls `setLLMConfig`
 * with the resolved `{ provider, apiKey }`. If no key is stored (or
 * credential refresh fails), `apiKey` is passed through as
 * `undefined` — this is how revocation propagates to the runtime.
 */
export async function authenticateAgent(
	runtime: CoreRuntime,
	provider: string,
	auth: AuthManager,
	failure?: KeyFailure,
): Promise<void> {
	const apiKey = await resolveApiKey(auth, provider, failure);
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
	failure?: KeyFailure,
): Promise<void> {
	const provider = state.core.llmConfig.provider;
	if (!provider) return;
	await authenticateAgent(runtime, provider, auth, failure);
}

// TODO: Can we not use the provider that has been set already during the compile step? (given that should populate?)
// That would simplify this to just a CompilerStep

function createAuthCompilerTransform(auth: AuthManager) {
	return (state: CoreState) =>
		applyStep<CoreSignature, CoreRuntime, CoreRuntime>(async (runtime) => {
			const failure: KeyFailure = {};
			// Install setLLMConfig wrapper to auto-resolve auth when provider is set.
			const originalSetLLMConfig = runtime.setLLMConfig.bind(runtime);
			runtime.setLLMConfig = async (config) => {
				const currentProvider = runtime.getSession().llmConfig.provider;
				const nextProvider = config.provider;
				const providerChanged =
					nextProvider !== undefined && nextProvider !== currentProvider;

				if (providerChanged && !('apiKey' in config)) {
					// We must still write `apiKey: undefined` explicitly on
					// resolution failure so the previous provider's key does not
					// survive config-merge on provider switch.
					config = {
						...config,
						apiKey: await resolveApiKey(auth, nextProvider, failure),
					};
				}
				return originalSetLLMConfig(config);
			};

			// A missing-key turn end reports the failure that left the key unset.
			const originalPrompt = runtime.prompt.bind(runtime);
			runtime.prompt = (message) =>
				explainMissingKey(originalPrompt(message), () => failure.current);

			// Initial login resolves credentials for the configured provider,
			// or no-ops if none is set.
			await reconnectAgent(runtime, state, auth, failure);

			// Live credential sync pushes new keys when this runtime's provider changes.
			const unsubscribe = auth.onAuthChange((provider) => {
				void (async () => {
					if (runtime.getSession().llmConfig.provider !== provider) {
						return;
					}
					await authenticateAgent(runtime, provider, auth, failure);
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
 *
 * When resolution fails, the prompt's AuthKeyNotSpecified turn end is
 * explained: a rejected token becomes AuthKeyInvalid with the provider's
 * message; other failures become LlmError with theirs.
 */
export function withAuth(
	module: CoreStateModule,
	auth: AuthManager,
): CoreStateModule {
	return liftStateCompilerTransform(createAuthCompilerTransform(auth))(module);
}
