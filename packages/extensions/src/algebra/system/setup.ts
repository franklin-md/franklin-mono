import type { BaseAPI } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { RuntimeSystem } from './types.js';

/**
 * Decorate a RuntimeSystem with a post-build setup callback.
 *
 * The returned system has the same type signature — callers (including
 * `combine` / `systems`) cannot tell it apart from the original. The
 * `setup` function runs after the compiler's `build()` produces a
 * runtime, receiving both the live runtime and the state that seeded it.
 */
export function withSetup<
	S extends BaseState,
	API extends BaseAPI,
	RT extends BaseRuntime<S>,
>(
	system: RuntimeSystem<S, API, RT>,
	setup: (runtime: RT, state: S) => Promise<void>,
): RuntimeSystem<S, API, RT> {
	return {
		emptyState: () => system.emptyState(),

		async createCompiler(state: S) {
			const compiler = await system.createCompiler(state);
			return {
				api: compiler.api,
				async build() {
					const runtime = await compiler.build();
					await setup(runtime, state);
					return runtime;
				},
			};
		},
	};
}
