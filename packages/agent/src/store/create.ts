import { produce } from 'immer';

import type { Store } from './types.js';

/**
 * Creates a reactive store with Immer-style immutable updates.
 * Synchronous notification matches the `useSyncExternalStore` contract.
 */
export function createStore<T>(initial: T): Store<T> {
	let current = initial;
	const listeners = new Set<(value: T) => void>();

	return {
		get: () => current,

		set(recipe) {
			const next = produce(current, recipe);
			if (Object.is(current, next)) return;
			current = next;
			for (const listener of listeners) {
				listener(current);
			}
		},

		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
