import type { Sharing } from './sharing.js';
import { shouldSnapshot } from './sharing.js';
import { StorePool } from './pool.js';
import type { Store } from './types.js';
import type { StoreSnapshot } from './snapshot.js';

export type StoreEntry = {
	poolId: string;
	store: Store<unknown>;
	sharing: Sharing;
};

/**
 * The compiled output of store registrations.
 *
 * A flat map of name → store entry backed by a shared {@link StorePool}.
 * Each entry holds a pool ID, a {@link Store}, and its sharing mode.
 * The `copy(level)` method produces a new StoreResult for child agents —
 * snapshotted stores get new pool entries while shared stores carry the
 * same pool ID through.
 */
export interface StoreResult {
	readonly stores: ReadonlyMap<string, StoreEntry>;
	readonly pool: StorePool;

	/**
	 * Copy stores for a child agent.
	 *
	 * - global stores: always same pool entry
	 * - private stores: always new pool entry with snapshot value
	 * - inherit stores: same pool entry unless copy level is private
	 */
	copy(level: Sharing): StoreResult;
}

/**
 * Create an empty StoreResult backed by the given pool.
 */
export function createEmptyStoreResult(
	pool: StorePool = new StorePool(),
): StoreResult {
	return createStoreResult(new Map(), pool);
}

/**
 * Create a StoreResult from a map of entries and a pool.
 */
export function createStoreResult(
	entries: Map<string, StoreEntry>,
	pool: StorePool,
): StoreResult {
	return {
		stores: entries,
		pool,
		copy(level: Sharing): StoreResult {
			const copied = new Map<string, StoreEntry>();
			for (const [name, entry] of entries) {
				if (shouldSnapshot(entry.sharing, level)) {
					// Create a new pool entry with a snapshot of the current value
					const { poolId, store } = pool.create(
						entry.store.get(),
						entry.sharing,
					);
					copied.set(name, { poolId, store, sharing: entry.sharing });
				} else {
					// Share the same pool entry
					copied.set(name, entry);
				}
			}
			return createStoreResult(copied, pool);
		},
	};
}

/**
 * Rebuild a StoreResult by wiring serialized store references to live pool
 * entries. The pool must already be restored before calling this.
 */
export function hydrateStores(
	stores: Record<string, StoreSnapshot>,
	pool: StorePool,
): StoreResult {
	const entries = new Map<string, StoreEntry>();

	for (const [name, { poolId, sharing }] of Object.entries(stores)) {
		entries.set(name, {
			poolId,
			store: pool.get(poolId),
			sharing,
		});
	}

	return createStoreResult(entries, pool);
}
