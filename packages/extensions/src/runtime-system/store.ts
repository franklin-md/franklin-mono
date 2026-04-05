import type { StoreAPI } from '../api/store/api.js';
import {
	createStoreResult,
	createEmptyStoreResult,
} from '../api/store/registry/result.js';
import type { StoreRegistry } from '../api/store/registry/index.js';
import { createStoreCompiler } from '../compile/store/compiler.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeSystem } from './types.js';
import type { StoreState } from '../state/store.js';
import { emptyStoreState } from '../state/store.js';
import type { StoreRuntime } from '../runtime/store.js';

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
