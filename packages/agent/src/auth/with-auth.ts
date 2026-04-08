import type { CoreSystem, CoreRuntime, CoreState } from '@franklin/extensions';
import { withSetup } from '@franklin/extensions';
import type { SessionRegistry } from '../agent/session/registry.js';
import type { FranklinState, FranklinRuntime } from '../types.js';
import type { IAuthManager } from './types.js';

/**
 * Authenticate a single runtime against the auth manager.
 *
 * Resolves the provider from `llmConfig` (falling back to the first
 * stored provider), fetches the API key, and pushes credentials into
 * the runtime via `setContext`.
 */
export async function loginAgent(
	runtime: CoreRuntime,
	state: CoreState,
	auth: IAuthManager,
): Promise<void> {
	const provider =
		state.core.llmConfig.provider ?? Object.keys(await auth.load())[0];
	if (!provider) return;

	const apiKey = await auth.getApiKey(provider);
	if (!apiKey) return;

	await runtime.setContext({
		config: { ...state.core.llmConfig, provider, apiKey },
	});
}

/**
 * Wrap a core system so that every compiled runtime is automatically
 * authenticated at build time and on provider changes.
 *
 * Two behaviors:
 * 1. **Initial login** — resolves the apiKey for the configured provider
 *    when the runtime is first built.
 * 2. **Auto-auth** — intercepts `setContext` calls. When a provider is
 *    specified without an apiKey, resolves the key from the auth
 *    manager before passing through.
 */
export function withAuth(system: CoreSystem, auth: IAuthManager): CoreSystem {
	return withSetup(system, async (runtime, state) => {
		// Install setContext wrapper to auto-resolve auth when provider is set.
		const originalSetContext = runtime.setContext.bind(runtime);
		runtime.setContext = async (ctx) => {
			if (ctx.config?.provider && !ctx.config.apiKey) {
				const apiKey = await auth.getApiKey(ctx.config.provider);
				if (apiKey) {
					ctx = { ...ctx, config: { ...ctx.config, apiKey } };
				}
			}
			return originalSetContext(ctx);
		};

		// Initial login — resolves credentials for the starting provider.
		await loginAgent(runtime, state, auth);
	});
}

/**
 * Wire up live credential sync: when a provider's key changes,
 * push the new key to all sessions using that provider.
 */
export function syncAuth(
	sessions: SessionRegistry<FranklinState, FranklinRuntime>,
	auth: IAuthManager,
): void {
	auth.onAuthChange(async (provider, authKey) => {
		const updates: Promise<unknown>[] = [];

		for (const session of sessions.list()) {
			const state = await session.runtime.state();
			if (state.core.llmConfig.provider !== provider) continue;

			updates.push(
				session.runtime.setContext({
					config: {
						...state.core.llmConfig,
						provider,
						apiKey: authKey,
					},
				}),
			);
		}

		await Promise.all(updates);
	});
}
