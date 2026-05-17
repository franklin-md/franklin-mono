import type { StoreMapping } from './api/registry/mapping.js';

export type StoreState = {
	store: StoreMapping;
};

export function emptyStoreState(): StoreState {
	return { store: {} };
}
