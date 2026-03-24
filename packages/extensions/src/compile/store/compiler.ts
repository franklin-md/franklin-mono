import type { Store } from '../../api/store/types.js';
import type { StoreAPI } from '../../api/store/api.js';
import { StoreResult } from '../../api/store/registry/result.js';
import type { Sharing } from '../../api/store/sharing.js';
import type { Compiler } from '../types.js';
import type { StoreMapping } from '../../api/store/registry/types.js';

export type StoreCompilerResult = { stores: StoreResult };

/**
 * Create a fresh store compiler instance.
 *
 * The store compiler handles `registerStore(name, initial, sharing?)` calls
 * from extensions and produces a `StoreResult` — a flat map of name → store
 * backed by the seed result's shared registry.
 *
 * If the seed already contains a store with the registered name, the
 * compiler reuses that store entry. Otherwise it creates a fresh pool entry
 * in the seed's registry.
 */
export function createStoreCompiler(
	seed: StoreResult,
): Compiler<StoreAPI, StoreCompilerResult> {
	const mapping: StoreMapping = {};

	const api: StoreAPI = {
		registerStore<T>(
			name: string,
			initial: T,
			// TODO: Get this working
			sharing: Sharing = 'private',
		): Store<T> {
			if (name in mapping) {
				throw new Error(`Store "${name}" is already registered`);
			}

			const existing = seed.get(name);
			const entry = existing ?? seed.registry.create(initial, sharing);
			mapping[name] = entry.ref;
			return entry.store as Store<T>;
		},
	};

	return {
		api,
		async build() {
			return { stores: new StoreResult(seed.registry, mapping) };
		},
	};
}
