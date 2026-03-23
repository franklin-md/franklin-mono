import type { Store } from '../../api/store/types.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { StoreResult, StoreEntry } from '../../api/store/result.js';
import { createStoreResult } from '../../api/store/result.js';
import { createStore } from '../../api/store/create.js';
import type { Sharing } from '../../api/store/sharing.js';
import type { Compiler } from '../types.js';

/**
 * Create a fresh store compiler instance.
 *
 * The store compiler handles `registerStore(name, initial, sharing?)` calls
 * from extensions and produces a `StoreResult` — a flat map of name → store
 * with copy semantics for child agent spawning.
 *
 * When `existing` is provided (from a parent agent's `StoreResult.copy()`),
 * stores that already exist in the parent are reused rather than created
 * fresh. This is how child agents inherit state.
 */
export function createStoreCompiler(
	existing?: StoreResult,
): Compiler<StoreAPI, StoreResult> {
	const entries = new Map<string, StoreEntry>();

	const api: StoreAPI = {
		registerStore<T>(
			name: string,
			initial: T,
			sharing: Sharing = 'private',
		): Store<T> {
			// TODO: Should we allow registering the same name? Could this not be a way of extension state sharing?
			if (entries.has(name)) {
				throw new Error(`Store "${name}" is already registered`);
			}

			// If a parent provided this store (via copy), reuse it.
			const existingEntry = existing?.stores.get(name);
			const store = existingEntry
				? (existingEntry.store as Store<T>)
				: createStore(initial);

			entries.set(name, { store: store as Store<unknown>, sharing });
			return store;
		},
	};

	return {
		api,
		async build() {
			return createStoreResult(entries);
		},
	};
}
