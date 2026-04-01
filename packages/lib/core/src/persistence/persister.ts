// A way to persist a Key-Value store (for key =String).
type Store<T> = Map<string, T>;
export interface Persister<T> {
	save(key: string, value: T): Promise<void>;
	load(): Promise<Store<T>>;
	delete(key: string): Promise<void>;
}
