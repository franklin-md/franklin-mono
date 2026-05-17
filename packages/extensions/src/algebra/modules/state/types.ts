import type { Signature } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { ExtensionModule } from '../simple/index.js';

/**
 * Grouped state snapshot/derivation operations for a runtime.
 *
 * Lives on the state extension module (`StateExtensionModule.state(runtime)`),
 * not on the runtime itself — runtimes carry only live capabilities + lifecycle.
 */
export interface StateHandle<S> {
	get(): Promise<S>;
	fork(): Promise<S>;
	child(): Promise<S>;
}

export type BaseState = Record<string, unknown>;

export type IdentityState = Record<never, never>;

export type StateExtensionModule<
	State extends BaseState,
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
> = {
	emptyState(): State;
	state(runtime: Runtime): StateHandle<State>;
	instantiate(state: State): ExtensionModule<S, Runtime>;
};

export type BaseStateExtensionModule = StateExtensionModule<any, any, any>;
