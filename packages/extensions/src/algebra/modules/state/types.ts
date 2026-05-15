import type { API } from '../../api/index.js';
import type { BaseRuntime, StateHandle } from '../../runtime/index.js';
import type { ExtensionModule } from '../simple/index.js';

export type { StateHandle } from '../../runtime/index.js';

export type BaseState = Record<string, unknown>;

export type IdentityState = Record<never, never>;

export type StateExtensionModule<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
> = {
	emptyState(): S;
	state(runtime: Runtime): StateHandle<S>;
	instantiate(state: S): ExtensionModule<A, Runtime>;
};

export type BaseStateExtensionModule = StateExtensionModule<any, any, any>;
