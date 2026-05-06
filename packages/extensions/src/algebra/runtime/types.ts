/**
 * Grouped state snapshot/derivation operations for a runtime.
 *
 * Lives on the harness module (`HarnessModule.state(runtime)`), not on the runtime
 * itself — runtimes carry only live capabilities + lifecycle.
 */
export interface StateHandle<S> {
	get(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
}

/**
 * Base constraint for harness runtimes — pure capability surface plus
 * lifecycle. State is projected from the harness module via
 * `HarnessModule.state(runtime)`, not exposed as a runtime field.
 */
export interface BaseRuntime {
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
