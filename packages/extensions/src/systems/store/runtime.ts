import type { StoreResult } from './api/registry/result.js';
import type { BaseRuntime, StateHandle } from '../../algebra/runtime/index.js';
import type { StoreState, StoreMapping } from './state.js';
import type { Store } from './api/types.js';
import type { StoreKey } from './api/key.js';

/**
 * Private symbol — the store system stashes its `StateHandle<StoreState>`
 * here on the runtime so the system's `state(runtime)` projection can
 * read it back without a side-channel. Module-private (not re-exported
 * from the package) so other systems can't reach in.
 */
export const STORE_STATE: unique symbol = Symbol('store/state');

/**
 * Store capabilities exposed to handlers at stage 1.
 *
 * `getStore(key)` is the only way to obtain a handle. Handles are never
 * captured at registration time. Returns the live `Store<T>` whose
 * value type is inferred from the `StoreKey`.
 */
export type StoreRuntime = BaseRuntime & {
	getStore<X extends string, T>(key: StoreKey<X, T>): Store<T>;
	getStore<T>(name: string): Store<T>;
	readonly [STORE_STATE]: StateHandle<StoreState>;
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
		getStore<T>(nameOrKey: string): Store<T> {
			const entry = stores.get(nameOrKey);
			if (!entry) {
				throw new Error(`Store "${nameOrKey}" was not registered`);
			}
			return entry.store as Store<T>;
		},
		[STORE_STATE]: {
			async get(): Promise<StoreState> {
				return { store: extractMapping(stores) };
			},
			async fork(): Promise<StoreState> {
				return { store: extractMapping(stores.share('copy')) };
			},
			async child(): Promise<StoreState> {
				return { store: extractMapping(stores.share('fresh')) };
			},
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

export function storeStateHandle(
	runtime: StoreRuntime,
): StateHandle<StoreState> {
	return runtime[STORE_STATE];
}
