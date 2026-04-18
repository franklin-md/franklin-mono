import type { AbsolutePath } from '../../paths/index.js';
import { encode } from '../../utils/bytes.js';
import type { Observer } from '../../utils/observer.js';
import { createObserver } from '../../utils/observer.js';
import type { Filesystem } from '../types.js';
import { readPrev } from './read-prev.js';
import type { ObservableFilesystem, WriteListener } from './types.js';

function toBytes(content: string | Uint8Array): Uint8Array {
	return typeof content === 'string' ? encode(content) : content;
}

/**
 * Wraps a `Filesystem` and exposes a write-event subscription.
 *
 * On every `writeFile`: pre-read the current contents (or `null` if
 * missing), forward the write, then notify subscribers with
 * `(path, prev, next)` where `next` is the bytes actually written.
 * All other operations pass through unchanged.
 */
export function createObservableFilesystem(
	inner: Filesystem,
): ObservableFilesystem {
	const observer: Observer<[AbsolutePath, Uint8Array | null, Uint8Array]> =
		createObserver();

	return {
		resolve: (...paths) => inner.resolve(...paths),
		readFile: (p) => inner.readFile(p),
		async writeFile(p, content) {
			const prev = await readPrev(inner, p);
			await inner.writeFile(p, content);
			observer.notify(p, prev, toBytes(content));
		},
		mkdir: (p, options) => inner.mkdir(p, options),
		access: (p) => inner.access(p),
		stat: (p) => inner.stat(p),
		readdir: (p) => inner.readdir(p),
		exists: (p) => inner.exists(p),
		glob: (pattern, options) => inner.glob(pattern, options),
		deleteFile: (p) => inner.deleteFile(p),
		onWrite: (listener: WriteListener) => observer.subscribe(listener),
	};
}
