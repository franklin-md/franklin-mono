import type { MiniACPConnector } from '@franklin/mini-acp';
import type { HarnessModule } from '../../harness/modules/index.js';
import type { CoreAPI } from './api/api.js';
import { createCoreCompiler } from './compile/compiler.js';
import { type CoreRuntime, coreStateHandle } from './runtime/index.js';
import type { CoreState } from './state.js';
import { emptyCoreState } from './state.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during module composition.
 */
export type CoreModule = HarnessModule<CoreState, CoreAPI, CoreRuntime>;

export function createCoreModule(connectAgent: MiniACPConnector): CoreModule {
	return {
		emptyState: emptyCoreState,
		state: (runtime) => coreStateHandle(runtime),
		createCompiler: (state) => createCoreCompiler(connectAgent, state),
	};
}
