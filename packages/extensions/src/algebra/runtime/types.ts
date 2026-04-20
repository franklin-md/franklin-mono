/**
 * Grouped state snapshot/derivation operations for a runtime.
 */
export interface StateHandle<S> {
	get(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
}

/**
 * Base constraint for system runtimes.
 *
 * Every runtime produced by a `RuntimeSystem` exposes a uniform lifecycle
 * surface (`state.get/fork/child`, dispose, subscribe) on top of which
 * systems add their own members. `combineRuntimes` recomposes these
 * lifecycle members while merging the extra surface areas.
 */
export interface BaseRuntime<S> {
	state: StateHandle<S>;
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
