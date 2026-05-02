import type { API } from '../../algebra/api/index.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { HarnessModule } from './types.js';

/**
 * Compiler-level decorator: run `setup` after build returns Runtime.
 *
 * Pure `Compiler => Compiler` functor — `build` is decorated to call
 * `setup(runtime)` after the inner build. State is captured by closure
 * at compiler-creation time and threaded by the module layer.
 */
export function withSetupCompiler<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	inner: Compiler<A, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): Compiler<A, Runtime> {
	return {
		createApi: <ContextRuntime extends BaseRuntime & A['In']>() =>
			inner.createApi<ContextRuntime>(),
		build: async <ContextRuntime extends BaseRuntime & A['In']>(
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		) => {
			const runtime = await inner.build<ContextRuntime>(getRuntime);
			await setup(runtime);
			return runtime;
		},
	};
}

/**
 * Module-level convenience: lift `withSetupCompiler` through `HarnessModule`.
 * `setup` receives the freshly-built runtime plus the state used to configure
 * this materialization.
 */
export function withSetup<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	module: HarnessModule<S, A, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): HarnessModule<S, A, Runtime> {
	return {
		emptyState: () => module.emptyState(),
		state: (runtime) => module.state(runtime),
		createCompiler(input) {
			return withSetupCompiler(module.createCompiler(input), (runtime) =>
				setup(runtime, input.state),
			);
		},
	};
}
