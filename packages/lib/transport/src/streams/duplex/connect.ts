import type { Duplex } from '../types.js';

/**
 * Bidirectionally connects two Duplexes by pumping between them:
 *
 *   a.readable → b.writable
 *   b.readable → a.writable
 *
 * Returns a Duplex whose close() cancels both directions
 * and cleanly closes the destination writables.
 */
export function connect<A, B>(a: Duplex<A, B>, b: Duplex<B, A>): Duplex<A, B> {
	const abort = new AbortController();

	const aToB = a.readable.pipeTo(b.writable, { signal: abort.signal });
	const bToA = b.readable.pipeTo(a.writable, { signal: abort.signal });

	return {
		readable: a.readable,
		writable: a.writable,
		close: async () => {
			abort.abort();
			await Promise.allSettled([aToB, bToA]);
			await Promise.allSettled([a.close(), b.close()]);
		},
	};
}
