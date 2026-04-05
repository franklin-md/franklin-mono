/** Maps store name (extension key) -> ref (registry UUID). */
export type StoreMapping = Record<string, string>;

export type StoreState = {
	store: StoreMapping;
};

export function emptyStoreState(): StoreState {
	return { store: {} };
}
