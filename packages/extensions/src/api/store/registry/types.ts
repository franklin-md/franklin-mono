import type { Sharing } from '../sharing.js';
import type { Store } from '../types.js';

export type StoreMetadata = {
	ref: string;
	sharing: Sharing;
};

export type StoreEntry = StoreMetadata & {
	store: Store<unknown>;
};
