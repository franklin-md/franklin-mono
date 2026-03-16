import type { Duplex } from '../types.js';
import { emptyReadable } from '../readable/empty.js';
import { emptyWritable } from '../writable/empty.js';

export function emptyDuplex<R, W = R>(): Duplex<R, W> {
	return {
		readable: emptyReadable<R>(),
		writable: emptyWritable<W>(),
		close: async () => {},
	};
}
