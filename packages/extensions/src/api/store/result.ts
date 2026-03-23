import type { Store } from './types.js';
import type { Sharing } from './sharing.js';
import { shouldSnapshot } from './sharing.js';
import { createStore } from './create.js';

export type StoreEntry = {
	store: Store<unknown>;
	sharing: Sharing;
};

/**
 * The compiled output of store registrations.
 *
 * A flat map of name → store + sharing metadata, with a `copy(level)`
 * method that produces a new StoreResult for child agents.
 */
export interface StoreResult {
	readonly stores: ReadonlyMap<string, StoreEntry>;

	/**
	 * Copy stores for a child agent.
	 *
	 * - global stores: always same reference
	 * - private stores: always independent snapshot
	 * - inherit stores: same reference unless copy level is private
	 */
	copy(level: Sharing): StoreResult;
}

/**
 * Create a StoreResult from a map of entries.
 */
export function createStoreResult(
	entries: Map<string, StoreEntry>,
): StoreResult {
	return {
		stores: entries,
		copy(level: Sharing): StoreResult {
			const copied = new Map<string, StoreEntry>();
			for (const [name, entry] of entries) {
				if (shouldSnapshot(entry.sharing, level)) {
					copied.set(name, {
						store: createStore(entry.store.get()),
						sharing: entry.sharing,
					});
				} else {
					copied.set(name, entry);
				}
			}
			return createStoreResult(copied);
		},
	};
}
