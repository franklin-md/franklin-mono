import type { StoreResult } from './api/registry/result.js';
import type { StateHandle } from '../../algebra/modules/state/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { StoreMapping } from './api/registry/mapping.js';
import type { Store } from './api/types.js';
import type { StoreKey } from './api/key.js';

/**
 * Private symbol — the store system stashes its `StateHandle<StoreMapping>`
 * here on the runtime so the system's `state(runtime)` projection can
 * read it back without a side-channel.
 */
export const STORE_MAPPING: unique symbol = Symbol('store/mapping');

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
	readonly [STORE_MAPPING]: StateHandle<StoreMapping>;
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
		[STORE_MAPPING]: {
			async get(): Promise<StoreMapping> {
				return extractMapping(stores);
			},
			async fork(): Promise<StoreMapping> {
				return extractMapping(stores.share('copy'));
			},
			async child(): Promise<StoreMapping> {
				return extractMapping(stores.share('fresh'));
			},
		},
		async dispose(): Promise<void> {
			// Registry owns store data; nothing to dispose
		},
	};
}

export function storeMappingHandle(
	runtime: StoreRuntime,
): StateHandle<StoreMapping> {
	return runtime[STORE_MAPPING];
}
