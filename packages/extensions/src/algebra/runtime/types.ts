/**
 * Base constraint for system runtimes.
 *
 * Every runtime produced by a `RuntimeSystem` exposes a uniform lifecycle
 * surface (state snapshot, fork/child derivation, dispose, subscribe) on
 * top of which systems add their own members. `combineRuntimes` recomposes
 * these lifecycle members while merging the extra surface areas.
 */
export interface BaseRuntime<S> {
	state(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
