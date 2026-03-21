import { BaseStore } from './base.js';

/**
 * Private store. `copy()` returns a new independent store
 * initialized with a snapshot of the current value.
 */
class PrivateStore<T> extends BaseStore<T> {
	copy(): PrivateStore<T> {
		return new PrivateStore(this.get());
	}
}

export function createPrivateStore<T>(initial: T): PrivateStore<T> {
	return new PrivateStore(initial);
}
