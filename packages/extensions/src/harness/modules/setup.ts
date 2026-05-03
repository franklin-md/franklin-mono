import type { API } from '../../algebra/api/index.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { HarnessModule } from './module.js';

export function withSetupCompiler<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	inner: Compiler<A, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): Compiler<A, Runtime> {
	return {
		createApi: () => inner.createApi(),
		// `Pick<ContextRuntime, never>` keeps the type parameter referenced
		// in the public signature so the no-unnecessary-type-parameters
		// lint rule sees ContextRuntime as load-bearing. The intersection is
		// `{}` and adds nothing at runtime; it's a structural marker.
		build: async <ContextRuntime extends BaseRuntime & A['In']>(
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		) => {
			const runtime = await inner.build<ContextRuntime>(getRuntime);
			await setup(runtime);
			return runtime;
		},
	};
}

export function withSetup<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	module: HarnessModule<S, A, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): HarnessModule<S, A, Runtime> {
	return {
		...module,
		createCompiler(state) {
			return withSetupCompiler(module.createCompiler(state), (runtime) =>
				setup(runtime, state),
			);
		},
	};
}
