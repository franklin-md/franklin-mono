import type { Store } from '../types/store.js';

export interface StoreAPI {
	registerStore<T>(name: string, initial: T): Store<T>;
}
