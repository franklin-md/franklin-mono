export type Observer<T> = {
	subscribe: (callback: (data: T) => void) => () => void;
};

/**
  Wraps a ReadableStream in an observer pattern.
 *
 * An internal pump consumes the readable and fans out each value
 * to all currently registered subscribers. Returns an Observer
 * with subscribe/unsubscribe semantics.
 */
export function observe<T>(readable: ReadableStream<T>): Observer<T> {
	const listeners = new Set<(data: T) => void>();

	const reader = readable.getReader();
	void (async () => {
		try {
			for (;;) {
				// How does the lifecycle of this operation work? Does it terminate only if observe is disposed?
				const { done, value } = await reader.read();
				if (done) break;
				for (const listener of listeners) {
					listener(value);
				}
			}
		} catch {
			// Stream closed or errored
		}
	})();

	return {
		subscribe: (callback: (data: T) => void) => {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		},
	};
}
