import type { Issue } from '../issue/types.js';

export type MapLoadResult<T> = {
	values: Map<string, T>;
	issues: Issue[];
};

export interface MapFilePersister<T> {
	save(id: string, value: T): Promise<void>;
	/** Flush queued saves when this persister buffers writes. */
	flush?(): Promise<void>;
	load(): Promise<MapLoadResult<T>>;
	delete(id: string): Promise<void>;
}
