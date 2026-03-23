import type { Store } from './types.js';
import type { Sharing } from './sharing.js';

export interface StoreAPI {
	registerStore<T>(name: string, initial: T, sharing?: Sharing): Store<T>;
}
