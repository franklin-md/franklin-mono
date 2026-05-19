import { BaseStore } from './base.js';
import type { Store } from './types.js';

/**
 * Creates a reactive store with Immer-style immutable updates.
 */
export function createStore<T>(initial: T): Store<T> {
	return new BaseStore(initial);
}
