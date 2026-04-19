import type { BaseAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { RuntimeSystem } from './types.js';

/**
 * Compiler-level decorator: run `setup` after build returns Runtime.
 *
 * Pure `Compiler => Compiler` functor — `build` is decorated to call
 * `setup(runtime, state)` after the inner build. State is available
 * because it now lives in `build`.
 */
export function withSetupCompiler<API, S, Runtime>(
	inner: Compiler<API, S, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): Compiler<API, S, Runtime> {
	return {
		api: inner.api,
		async build(state, getRuntime) {
			const runtime = await inner.build(state, getRuntime);
			await setup(runtime, state);
			return runtime;
		},
	};
}

/**
 * System-level convenience: lift `withSetupCompiler` through `RuntimeSystem`.
 */
export function withSetup<
	S extends BaseState,
	API extends BaseAPI,
	Runtime extends BaseRuntime<S>,
>(
	system: RuntimeSystem<S, API, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): RuntimeSystem<S, API, Runtime> {
	return {
		emptyState: () => system.emptyState(),
		createCompiler() {
			return withSetupCompiler(system.createCompiler(), setup);
		},
	};
}
