import type { Duplex } from '../streams/types.js';

// This is a pipe where you can put stuff in and take it out
export function createMemoryStream<A, B = A>(): Duplex<A, B> {
	const stream = new TransformStream<B, A>();

	return {
		readable: stream.readable,
		writable: stream.writable,
		dispose: async () => {
			await stream.writable.close();
		},
	};
}

/**
 * Creates two Duplexes connected back-to-back without locking any streams.
 *
 * Writing to `a.writable` appears on `b.readable`, and vice versa.
 * Neither side's streams are locked — callers can freely attach readers,
 * writers, or pipe them into other abstractions (e.g. SDK connections).
 */
export function createDuplexPair<A, B = A>(): {
	a: Duplex<A, B>;
	b: Duplex<B, A>;
} {
	const aToB = createMemoryStream<B>(); // a writes B, b reads B
	const bToA = createMemoryStream<A>(); // b writes A, a reads A

	return {
		a: {
			readable: bToA.readable,
			writable: aToB.writable,
			dispose: () => aToB.dispose(),
		},
		b: {
			readable: aToB.readable,
			writable: bToA.writable,
			dispose: () => bToA.dispose(),
		},
	};
}
