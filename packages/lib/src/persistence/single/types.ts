import type { Issue } from '../issue/types.js';

export type SingleLoadResult<T> = {
	value: T | undefined;
	issues: Issue[];
};

export interface SingleFilePersister<T> {
	save(value: T): Promise<void>;
	load(): Promise<SingleLoadResult<T>>;
	delete(): Promise<void>;
}
