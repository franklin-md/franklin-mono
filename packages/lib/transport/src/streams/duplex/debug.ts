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
	return intercept(duplex, {
		readable(chunk, pass) {
			console.log(`[${label}] readable:`, chunk);
			pass(chunk);
		},
		writable(chunk, pass) {
			console.log(`[${label}] writable:`, chunk);
			pass(chunk);
		},
	});
}
