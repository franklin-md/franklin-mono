// A way to persist a Key-Value store (for key =String).
// TODO: Rename this to `MapPersister`
type Store<T> = Map<string, T>;
export interface Persister<T> {
	save(key: string, value: T): Promise<void>;
	load(): Promise<Store<T>>;
	delete(key: string): Promise<void>;
}
