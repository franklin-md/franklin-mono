import { createReadControlPair } from '../readable/control.js';
import { pump } from '../readable/pump.js';
import type { Duplex } from '../types.js';
import { fromCallable } from '../writable/from-callable.js';

type Enqueue<T> = (value: T) => void;

// This is like Koa-Style Middlware, but more expressive as it allows for forwarding multiple messages forward and backward

export type Handler<R, W> = (
	chunk: R,
	pass: Enqueue<R>,
	cross: Enqueue<W>,
) => void | Promise<void>;

export interface InterceptHandlers<R, W = R> {
	readable?: Handler<R, W>;
	writable?: Handler<W, R>;
}

/**
 * Wraps a Duplex with interceptors on each direction.
 *
 * Handlers receive `addToRead` and `addToWrite` callbacks that push values
 * into the readable or writable sides of the inner Duplex.
 * This allows handlers to transform, filter, or inject cross-direction
 * responses (e.g. short-circuit a readable message by writing a reply back
 * via `addToWrite`).
 *
 */
export function intercept<R, W = R>(
	inner: Duplex<R, W>,
	handlers: InterceptHandlers<R, W>,
): Duplex<R, W> {
	if (!handlers.readable && !handlers.writable) return inner;

	const [enqueue, readable] = createReadControlPair<R>();
	const innerWriter = inner.writable.getWriter();
	const writeInner = (value: W) => {
		void innerWriter.write(value);
	};

	// Read from inner and give option to f to either pass onto it's readable (i.e. transform of R -> f(R):R)
	// TODO: if there is not handlers.readable, I think we should optimize and avoid the pump
	void pump(inner.readable, async (chunk) => {
		if (handlers.readable) {
			await Promise.resolve(handlers.readable(chunk, enqueue, writeInner));
		} else {
			enqueue(chunk);
		}
	});

	// Before writing to inner, give option to value to inner read (cross) or transform and pass on

	const writable = fromCallable<W>(async (chunk) => {
		if (handlers.writable) {
			await Promise.resolve(handlers.writable(chunk, writeInner, enqueue));
		} else {
			writeInner(chunk);
		}
	});

	return {
		readable,
		writable,
		close: async () => {
			innerWriter.releaseLock();
			await inner.close();
		},
	};
}
