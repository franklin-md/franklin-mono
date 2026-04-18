import type { AbsolutePath } from '../../paths/index.js';
import type { Filesystem } from '../types.js';

/**
 * Listener invoked once for every `writeFile` that passes through an
 * `ObservableFilesystem`. `prev` is `null` when the file did not exist
 * pre-write (i.e. the write created the file). `next` is the bytes
 * actually written.
 */
export type WriteListener = (
	path: AbsolutePath,
	prev: Uint8Array | null,
	next: Uint8Array,
) => void;

export interface FilesystemObservables {
	onWrite(listener: WriteListener): () => void;
}

/**
 * A `Filesystem` that also exposes write events. Substitutable wherever
 * a plain `Filesystem` is expected; consumers that want to observe
 * writes keep the narrower typed reference.
 */
export type ObservableFilesystem = Filesystem & FilesystemObservables;
