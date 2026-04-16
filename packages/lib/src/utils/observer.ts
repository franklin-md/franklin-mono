export type Observer<TArgs extends unknown[] = []> = {
	notify(...args: TArgs): void;
	subscribe(listener: (...args: TArgs) => void): () => void;
};

/**
 * Minimal observer — a reusable subscribe/notify pair.
 *
 * Use `notify()` internally where state changes, and expose
 * `subscribe` to consumers who need to react.
 */
export function createObserver<
	TArgs extends unknown[] = [],
>(): Observer<TArgs> {
	const listeners = new Set<(...args: TArgs) => void>();

	return {
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
