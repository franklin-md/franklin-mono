export interface ReadonlyStore<T> {
	get(): T;
	subscribe(listener: (value: T) => void): () => void;
}

export interface Store<T> extends ReadonlyStore<T> {
	set(recipe: (draft: T) => T | undefined): void;
	copy(): Store<T>;
}
