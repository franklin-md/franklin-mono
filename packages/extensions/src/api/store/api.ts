import type { Store } from './types.js';
import type { Sharing } from './sharing.js';
import type { StoreKey } from './key.js';

// TODO: We should only allow T that are simple types like
// string, number, boolean, null, undefined, records, arrays, etc.
export interface StoreAPI {
	registerStore<X extends string, T>(
		key: StoreKey<X, T>,
		initial: T,
		sharing?: Sharing,
	): Store<T>;
	registerStore<T>(name: string, initial: T, sharing?: Sharing): Store<T>;
}
