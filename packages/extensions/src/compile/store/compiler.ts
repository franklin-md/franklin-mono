import type { Store } from '../../api/store/types.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { StoreResult, StoreEntry } from '../../api/store/result.js';
import {
	createEmptyStoreResult,
	createStoreResult,
} from '../../api/store/result.js';
import type { Sharing } from '../../api/store/sharing.js';
import type { Compiler } from '../types.js';

/**
 * Create a fresh store compiler instance.
 *
 * The store compiler handles `registerStore(name, initial, sharing?)` calls
 * from extensions and produces a `StoreResult` — a flat map of name → store
 * backed by the seed result's shared pool.
 *
 * If the seed already contains a store with the registered name, the
 * compiler reuses that store entry. Otherwise it creates a fresh pool entry
 * in the seed's pool.
 */
export function createStoreCompiler(
	seed: StoreResult = createEmptyStoreResult(),
): Compiler<StoreAPI, StoreResult> {
	const entries = new Map<string, StoreEntry>();
	const pool = seed.pool;

	function getSeededEntry<T>(
		name: string,
		sharing: Sharing,
	): { poolId: string; store: Store<T> } | undefined {
		const existing = seed.stores.get(name);
		if (!existing) return undefined;
		if (existing.sharing !== sharing) {
			throw new Error(
				`Store "${name}" was seeded with sharing "${existing.sharing}" but registered with "${sharing}"`,
			);
		}
		return { poolId: existing.poolId, store: existing.store as Store<T> };
	}

	const api: StoreAPI = {
		registerStore<T>(
			name: string,
			initial: T,
			sharing: Sharing = 'private',
		): Store<T> {
			if (entries.has(name)) {
				throw new Error(`Store "${name}" is already registered`);
			}

			const { poolId, store } =
				getSeededEntry<T>(name, sharing) ?? pool.create(initial, sharing);
			entries.set(name, {
				poolId,
				store,
				sharing,
			});
			return store;
		},
	};

	return {
		api,
		async build() {
			return createStoreResult(entries, pool);
		},
	};
}
