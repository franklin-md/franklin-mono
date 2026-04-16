import type { StoreAPI } from './api/api.js';
import {
	createStoreResult,
	createEmptyStoreResult,
} from './api/registry/result.js';
import type { StoreRegistry } from './api/registry/index.js';
import { createStoreCompiler } from './compile/compiler.js';
import type { Compiler } from '../../algebra/compiler/types.js';
import type { RuntimeSystem } from '../../algebra/system/types.js';
import type { StoreState } from './state.js';
import { emptyStoreState } from './state.js';
import type { StoreRuntime } from './runtime.js';

export type StoreSystem = RuntimeSystem<StoreState, StoreAPI, StoreRuntime>;

export function createStoreSystem(registry: StoreRegistry): StoreSystem {
	return {
		emptyState: emptyStoreState,

		async createCompiler(
			state: StoreState,
		): Promise<Compiler<StoreAPI, StoreRuntime>> {
			const mapping = state.store;
			const hasEntries = Object.keys(mapping).length > 0;
			const seed = hasEntries
				? createStoreResult(registry, mapping)
				: createEmptyStoreResult(registry);
			return createStoreCompiler(seed);
		},
	};
}
