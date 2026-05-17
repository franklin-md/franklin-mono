/**
 * Base constraint for harness runtimes — pure capability surface plus
 * lifecycle. State is projected from the harness module via
 * `StateExtensionModule.state(runtime)`, not exposed as a runtime field.
 */
export interface BaseRuntime {
	dispose(): Promise<void>;
	subscribe(listener: () => void): () => void;
}
