import type { Duplex } from '../types.js';

/**
 * Wraps a Duplex with logging that echoes every chunk passing through
 * in both directions. The data is passed through unchanged.
 */
export function debugStream<R, W = R>(
	duplex: Duplex<R, W>,
	label = 'debug',
): Duplex<R, W> {
	const render = (chunk: any) => {
		if (chunk instanceof Uint8Array) {
			return chunk.toString();
		}
		return JSON.stringify(chunk);
	};
	const readableTransform = new TransformStream<R, R>({
		transform(chunk, controller) {
			console.log(`[${label}] readable:`, render(chunk));
			controller.enqueue(chunk);
		},
	});

	const writableTransform = new TransformStream<W, W>({
		transform(chunk, controller) {
			console.log(`[${label}] writable:`, render(chunk));
			controller.enqueue(chunk);
		},
	});

	const readable = duplex.readable.pipeThrough(readableTransform);
	const writable = writableTransform.writable;

	void writableTransform.readable.pipeTo(duplex.writable).catch(() => {});

	return {
		readable,
		writable,
		close: () => duplex.close(),
	};
}
