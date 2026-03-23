import type { Store } from './types.js';
import type { Sharing } from './sharing.js';
import type { StoreKey } from './key.js';

export interface StoreAPI {
	registerStore<X extends string, T>(
		key: StoreKey<X, T>,
		initial: T,
		sharing?: Sharing,
	): Store<T>;
	registerStore<T>(name: string, initial: T, sharing?: Sharing): Store<T>;
}
