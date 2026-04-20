import type { Sharing } from './sharing.js';
import type { StoreKey } from './key.js';

// TODO: We should only allow T that are simple types like
// string, number, boolean, null, undefined, records, arrays, etc.
export interface StoreAPI {
	registerStore<X extends string, T>(
		key: StoreKey<X, T>,
		initial: T,
		sharing: Sharing,
	): void;
	registerStore(name: string, initial: unknown, sharing: Sharing): void;
}
