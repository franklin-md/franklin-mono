import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { StateExtensionModule } from '../../algebra/modules/state/index.js';
import type { StoreSignature } from './api/api.js';
import type { StoreRegistry } from './api/registry/index.js';
import { createStoreCompiler } from './compile/compiler.js';
import { type StoreRuntime, storeStateHandle } from './runtime.js';
import type { StoreState } from './state.js';
import { emptyStoreState } from './state.js';

export type StoreModule = StateExtensionModule<
	StoreState,
	StoreSignature,
	StoreRuntime
>;

const storeExtensionPoint = createExtensionPoint<StoreSignature>({
	registerStore: true,
});

export function createStoreModule(registry: StoreRegistry): StoreModule {
	return {
		emptyState: emptyStoreState,

		state: storeStateHandle,

		instantiate(state) {
			return {
				extensionPoint: storeExtensionPoint,
				compiler: createStoreCompiler(registry, state),
			};
		},
	};
}
