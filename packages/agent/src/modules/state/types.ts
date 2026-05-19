import type { Signature } from '@franklin/extensibility';
import type { BaseRuntime, StateHandle } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';

export type { StateHandle } from '@franklin/extensibility';

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
