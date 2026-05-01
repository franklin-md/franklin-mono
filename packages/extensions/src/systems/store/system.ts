import type { StoreAPI } from './api/api.js';
import type { StoreRegistry } from './api/registry/index.js';
import { createStoreCompiler } from './compile/compiler.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { StoreState } from './state.js';
import { emptyStoreState } from './state.js';
import { storeStateHandle, type StoreRuntime } from './runtime.js';

export type StoreSystem = RuntimeSystem<StoreState, StoreAPI, StoreRuntime>;

export function createStoreSystem(registry: StoreRegistry): StoreSystem {
	return {
		emptyState: emptyStoreState,

		state: storeStateHandle,

		createCompiler(state): Compiler<StoreAPI, StoreRuntime> {
			return createStoreCompiler(registry, state);
		},
	};
}
