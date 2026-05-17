import type { MiniACPConnector } from '@franklin/mini-acp';
import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { StateExtensionModule } from '../../algebra/modules/state/index.js';
import type { CoreSignature } from './api/api.js';
import { createCoreCompiler } from './compile/compiler.js';
import { type CoreRuntime, coreStateHandle } from './runtime/index.js';
import type { CoreState } from './state.js';
import { emptyCoreState } from './state.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during module composition.
 */
export type CoreModule = StateExtensionModule<
	CoreState,
	CoreSignature,
	CoreRuntime
>;

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

export function createCoreModule(connectAgent: MiniACPConnector): CoreModule {
	return {
		emptyState: emptyCoreState,
		state: (runtime) => coreStateHandle(runtime),
		instantiate: (state) => ({
			extensionPoint: coreExtensionPoint,
			compiler: createCoreCompiler(connectAgent, state),
		}),
	};
}
