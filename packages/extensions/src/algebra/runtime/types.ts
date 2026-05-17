/**
 * Grouped state snapshot/derivation operations for a runtime.
 *
 * Lives on the state extension module (`StateExtensionModule.state(runtime)`), not on the runtime
 * itself — runtimes carry only live capabilities + lifecycle.
 */
export interface StateHandle<S> {
	get(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
}

/**
 * Base constraint for module runtimes — pure capability surface plus
 * lifecycle. State is projected from the state extension module via
 * `StateExtensionModule.state(runtime)`, not exposed as a runtime field.
 */
export interface BaseRuntime {
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
