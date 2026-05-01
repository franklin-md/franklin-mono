import type { BaseAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { RuntimeSystem } from './types.js';

/**
 * Compiler-level decorator: run `setup` after build returns Runtime.
 *
 * Pure `Compiler => Compiler` functor — `build` is decorated to call
 * `setup(runtime)` after the inner build. State is captured by closure
 * at compiler-creation time and threaded by the system layer.
 */
export function withSetupCompiler<API, Runtime>(
	inner: Compiler<API, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): Compiler<API, Runtime> {
	return {
		api: inner.api,
		async build(getRuntime) {
			const runtime = await inner.build(getRuntime);
			await setup(runtime);
			return runtime;
		},
	};
}

/**
 * System-level convenience: lift `withSetupCompiler` through `RuntimeSystem`.
 * `setup` receives the freshly-built runtime plus the state used to
 * configure this compilation.
 */
export function withSetup<
	S extends BaseState,
	API extends BaseAPI,
	Runtime extends BaseRuntime,
>(
	system: RuntimeSystem<S, API, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): RuntimeSystem<S, API, Runtime> {
	return {
		emptyState: () => system.emptyState(),
		state: (runtime) => system.state(runtime),
		createCompiler(state) {
			return withSetupCompiler(system.createCompiler(state), (runtime) =>
				setup(runtime, state),
			);
		},
	};
}
