/**
 * Grouped state snapshot/derivation operations for a runtime.
 *
 * Lives on the state module layer, not on the runtime itself — runtimes carry
 * only live capabilities + lifecycle.
 */
export interface StateHandle<S> {
	get(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
}

/**
 * Base constraint for module runtimes — pure capability surface plus
 * lifecycle. State is projected from the state module layer, not exposed as a
 * runtime field.
 */
export interface BaseRuntime {
	dispose(): Promise<void>;
}
