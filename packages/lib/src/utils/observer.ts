export type Observer<TArgs extends unknown[] = []> = {
	readonly listenerCount: number;
	notify(...args: TArgs): void;
	subscribe(listener: (...args: TArgs) => void): () => void;
};

/**
 * Minimal observer — a reusable subscribe/notify pair.
 *
 * Use `notify()` internally where state changes, and expose
 * `subscribe` to consumers who need to react.
 */
export function createObserver<TArgs extends unknown[] = []>(
	initialListeners: Iterable<(...args: TArgs) => void> = [],
): Observer<TArgs> {
	const listeners = new Set(initialListeners);

	return {
		get listenerCount() {
			return listeners.size;
		},
		notify(...args) {
			for (const listener of listeners) listener(...args);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
