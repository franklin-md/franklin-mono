import type { StateExtensionModule } from '@franklin/extensibility';
import type { StateHandle } from '@franklin/extensibility';
import type { StoreSignature } from './api/api.js';
import type { StoreRegistry } from './api/registry/index.js';
import type { StoreMapping } from './api/registry/mapping.js';
import { createStoreModule } from './module.js';
import { storeMappingHandle, type StoreRuntime } from './runtime.js';
import { emptyStoreState, type StoreState } from './state.js';

export type StoreStateModule = StateExtensionModule<
	StoreState,
	StoreSignature,
	StoreRuntime
>;

function wrapStoreStateHandle(
	handle: StateHandle<StoreMapping>,
): StateHandle<StoreState> {
	return {
		async get() {
			return { store: await handle.get() };
		},
		async fork() {
			return { store: await handle.fork() };
		},
		async child() {
			return { store: await handle.child() };
		},
	};
}

export function storeStateHandle(
	runtime: StoreRuntime,
): StateHandle<StoreState> {
	return wrapStoreStateHandle(storeMappingHandle(runtime));
}

export function createStoreStateModule(
	registry: StoreRegistry,
): StoreStateModule {
	return {
		emptyState: emptyStoreState,
		state: storeStateHandle,
		instantiate(state) {
			return createStoreModule(registry, state.store);
		},
	};
}
