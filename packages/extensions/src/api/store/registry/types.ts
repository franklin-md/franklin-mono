import type { Sharing } from '../sharing.js';
import type { Store } from '../types.js';

/** Maps store name (extension key) → ref (pool UUID). */
export type StoreMapping = Record<string, string>;

export type StoreMetadata = {
	ref: string;
	sharing: Sharing;
};

export type StoreEntry = StoreMetadata & {
	store: Store<unknown>;
};
