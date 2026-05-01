import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { CoreAPI } from './api/api.js';
import { createCoreCompiler, type SpawnFn } from './compile/compiler.js';
import { type CoreRuntime, coreStateHandle } from './runtime/index.js';
import type { CoreState } from './state.js';
import { emptyCoreState } from './state.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during system composition.
 */
export type CoreSystem = RuntimeSystem<CoreState, CoreAPI, CoreRuntime>;

export function createCoreSystem(spawn: SpawnFn): CoreSystem {
	return {
		emptyState: emptyCoreState,
		state: (runtime) => coreStateHandle(runtime),
		createCompiler: (state: CoreState) => createCoreCompiler(spawn, state),
	};
}
