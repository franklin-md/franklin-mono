/**
 * A read-only reactive store. Consumers can read the current value
 * and subscribe to changes, but cannot mutate state directly.
 * Compatible with React's `useSyncExternalStore`.
 */
export interface ReadonlyStore<T> {
	get(): T;
	subscribe(listener: (value: T) => void): () => void;
}

export type StoreRecipe<T> = ((draft: T) => T) | ((draft: T) => void);

/**
 * A mutable reactive store. Extends ReadonlyStore with an Immer-style
 * `set()` method. The implementation may provide a mutable draft, but the
 * public type stays Franklin-owned so consumers do not inherit Immer's
 * recursive `Draft<T>` type.
 */
export interface Store<T> extends ReadonlyStore<T> {
	set(recipe: StoreRecipe<T>): void;
}
