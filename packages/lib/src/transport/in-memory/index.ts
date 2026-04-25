import type { Duplex } from '../streams/types.js';

// This is a pipe where you can put stuff in and take it out
export function createMemoryStream<A, B = A>(): Duplex<A, B> {
	let controller!: ReadableStreamDefaultController<A>;
	let closed = false;

	const closeReadable = () => {
		if (closed) return;
		closed = true;
		try {
			controller.close();
		} catch {
			// Already closed or cancelled.
		}
	};

	const readable = new ReadableStream<A>({
		start(c) {
			controller = c;
		},
		cancel() {
			closed = true;
		},
	});

	const writable = new WritableStream<B>({
		write(chunk) {
			if (closed) throw new Error('Stream closed');
			controller.enqueue(chunk as unknown as A);
		},
		close() {
			closeReadable();
		},
		abort() {
			closeReadable();
		},
	});

	return {
		readable,
		writable,
		dispose: async () => {
			closeReadable();
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
	let disposed = false;
	const dispose = async () => {
		if (disposed) return;
		disposed = true;
		await Promise.all([aToB.dispose(), bToA.dispose()]);
	};

	return {
		a: {
			readable: bToA.readable,
			writable: aToB.writable,
			dispose,
		},
		b: {
			readable: aToB.readable,
			writable: bToA.writable,
			dispose,
		},
	};
}
