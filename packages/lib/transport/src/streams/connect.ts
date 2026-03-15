import type { Stream } from './types.js';

/**
 * Bidirectionally connects two Pipes by pumping bytes between them:
 *
 *   a.readable → b.writable
 *   b.readable → a.writable
 *
 * Returns a Connection whose `dispose()` cancels both directions
 * and cleanly closes the destination writables (so readers see EOF,
 * not an abort error).
 */
export function connect<T>(a: Stream<T>, b: Stream<T>): Stream<T> {
	const abort = new AbortController();

	const aToB = a.readable.pipeTo(b.writable, { signal: abort.signal });
	const bToA = b.readable.pipeTo(a.writable, { signal: abort.signal });

	return {
		readable: a.readable,
		writable: b.writable,
		close: async () => {
			abort.abort();
			await Promise.allSettled([aToB, bToA]);
			// Waits for pipes to close and release resources
			await Promise.allSettled([a.close(), b.close()]);
		},
	};
}
