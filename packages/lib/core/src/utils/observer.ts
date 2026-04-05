export type Observer = {
	notify(): void;
	subscribe(listener: () => void): () => void;
};

/**
 * Minimal observer — a reusable subscribe/notify pair.
 *
 * Use `notify()` internally where state changes, and expose
 * `subscribe` to consumers who need to react.
 */
export function createObserver(): Observer {
	const listeners = new Set<() => void>();

	return {
		notify() {
			for (const l of listeners) l();
		},
		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
