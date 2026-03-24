/**
 * Generic persistence contract keyed by snapshot ID.
 *
 * Implementations handle I/O (filesystem, IPC, etc.) while callers own
 * the in-memory lifecycle and decide *when* to persist.
 */
export interface Persister<T> {
	save(id: string, snapshot: T): Promise<void>;
	load(): Promise<Map<string, T>>;
	delete(id: string): Promise<void>;
}
