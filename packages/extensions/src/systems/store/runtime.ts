import type { StoreResult } from './api/registry/result.js';
import type { RuntimeBase } from '../../algebra/runtime/types.js';
import type { StoreState, StoreMapping } from './state.js';

export type StoreRuntime = RuntimeBase<StoreState> & {
	readonly stores: StoreResult;
};

function extractMapping(stores: StoreResult): StoreMapping {
	const m: StoreMapping = {};
	for (const [name, entry] of stores.entries()) {
		m[name] = entry.ref;
	}
	return m;
}

export function createStoreRuntime(stores: StoreResult): StoreRuntime {
	return {
		stores,
		async state(): Promise<StoreState> {
			return { store: extractMapping(stores) };
		},
		async fork(): Promise<StoreState> {
			return { store: extractMapping(stores.share('copy')) };
		},
		async child(): Promise<StoreState> {
			return { store: extractMapping(stores.share('fresh')) };
		},
		async dispose(): Promise<void> {
			// Registry owns store data; nothing to dispose
		},
		subscribe(_listener: () => void): () => void {
			// Store mappings (name→ref) are stable after creation — no changes to notify.
			return () => {};
		},
	};
}
