import type { Signature } from '../../api/index.js';
import type { BaseRuntime, StateHandle } from '../../runtime/index.js';
import type { ExtensionModule } from '../simple/index.js';

export type { StateHandle } from '../../runtime/index.js';

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
