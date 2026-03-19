import { BaseStore } from './base.js';

/**
 * Shared store. `copy()` returns the same instance,
 * so all copies read and write the same underlying state.
 */
class SharedStore<T> extends BaseStore<T> {
	copy(): SharedStore<T> {
		return this;
	}
}

export function createSharedStore<T>(initial: T): SharedStore<T> {
	return new SharedStore(initial);
}
