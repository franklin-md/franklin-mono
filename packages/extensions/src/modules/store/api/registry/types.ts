import type { Store } from '../types.js';
import type { Sharing } from '../sharing.js';

export type StoreMetadata = {
	ref: string;
	sharing: Sharing;
};

export type StoreEntry = StoreMetadata & {
	store: Store<unknown>;
};
