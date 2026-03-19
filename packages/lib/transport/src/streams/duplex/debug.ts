import type { Duplex } from '../types.js';
import { intercept } from './intercept.js';

/**
 * Wraps a Duplex with logging that echoes every chunk passing through
 * in both directions. The data is passed through unchanged.
 */
export function debugStream<R, W = R>(
	duplex: Duplex<R, W>,
	label = 'debug',
): Duplex<R, W> {
	const render = (chunk: unknown) => {
		if (chunk instanceof Uint8Array) {
			return chunk.toString();
		}
		return JSON.stringify(chunk);
	};

	return intercept(duplex, {
		readable(chunk, controller) {
			console.log(`[${label}] readable:`, render(chunk));
			controller.enqueue(chunk);
		},
		writable(chunk, controller) {
			console.log(`[${label}] writable:`, render(chunk));
			controller.enqueue(chunk);
		},
	});
}
