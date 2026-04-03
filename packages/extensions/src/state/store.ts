/** Maps store name (extension key) -> ref (pool UUID). */
export type StoreMapping = Record<string, string>;

export type StoreState = {
	store: StoreMapping;
};

export function emptyStoreState(): StoreState {
	return { store: {} };
}
