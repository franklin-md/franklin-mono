import { createPrivateStore } from './private.js';
import type { Store } from './types.js';

/**
 * Creates a reactive store with Immer-style immutable updates.
 * Alias for `createPrivateStore` — copies produce independent snapshots.
 */
export function createStore<T>(initial: T): Store<T> {
	return createPrivateStore(initial);
}
