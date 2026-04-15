import type { Observer } from '../types.js';
import { pump } from './pump.js';

/**
 * Wraps a ReadableStream in an observer pattern.
 *
 * An internal pump consumes the readable and fans out each value
 * to all currently registered subscribers. Returns an Observer
 * with subscribe/unsubscribe semantics and a dispose handle.
 */
export function observe<T>(readable: ReadableStream<T>): Observer<T> {
	const listeners = new Set<(data: T) => void>();
	const abort = new AbortController();

	void pump(readable, (value) => {
		if (abort.signal.aborted) return;
		for (const listener of listeners) {
			listener(value);
		}
	});

	return {
		subscribe: (callback: (data: T) => void) => {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		},
		dispose: () => {
			abort.abort();
			listeners.clear();
		},
	};
}
