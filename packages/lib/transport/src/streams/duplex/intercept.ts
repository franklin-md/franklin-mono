import type { Duplex } from '../types.js';

export interface InterceptHandlers<R, W = R> {
	readable?: (
		chunk: R,
		controller: TransformStreamDefaultController<R>,
	) => void | Promise<void>;
	writable?: (
		chunk: W,
		controller: TransformStreamDefaultController<W>,
	) => void | Promise<void>;
}

/**
 * Wraps a Duplex with optional TransformStream interceptors on each direction.
 * Generalises `debugStream` — handlers can transform, filter, or side-effect
 * on each chunk flowing through.
 */
export function intercept<R, W = R>(
	duplex: Duplex<R, W>,
	handlers: InterceptHandlers<R, W>,
): Duplex<R, W> {
	let { readable } = duplex;
	if (handlers.readable) {
		const transform = new TransformStream<R, R>({
			transform: handlers.readable,
		});
		readable = duplex.readable.pipeThrough(transform);
	}

	let { writable } = duplex;
	if (handlers.writable) {
		const transform = new TransformStream<W, W>({
			transform: handlers.writable,
		});
		writable = transform.writable;
		void transform.readable.pipeTo(duplex.writable).catch(() => {});
	}

	return { readable, writable, close: () => duplex.close() };
}
