import type { Draft } from 'immer';

/**
 * A read-only reactive store. Consumers can read the current value
 * and subscribe to changes, but cannot mutate state directly.
 * Compatible with React's `useSyncExternalStore`.
 */
export interface ReadonlyStore<T> {
	get(): T;
	subscribe(listener: (value: T) => void): () => void;
}

/**
 * A mutable reactive store. Extends ReadonlyStore with an Immer-style
 * `set()` method that accepts a producer function operating on a draft.
 */
export interface Store<T> extends ReadonlyStore<T> {
	set(recipe: (draft: Draft<T>) => void): void;
}
