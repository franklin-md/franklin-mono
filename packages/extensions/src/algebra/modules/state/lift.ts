import type { API } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { ExtensionModule } from '../simple/index.js';
import type {
	IdentityState,
	StateExtensionModule,
	StateHandle,
} from './types.js';

const EMPTY_STATE_HANDLE: StateHandle<IdentityState> = {
	async get() {
		return {};
	},
	async fork() {
		return {};
	},
	async child() {
		return {};
	},
};

export function identityState(): IdentityState {
	return {};
}

export function identityStateHandle(): StateHandle<IdentityState> {
	return EMPTY_STATE_HANDLE;
}

export function liftExtensionModule<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	module: ExtensionModule<A, Runtime>,
): StateExtensionModule<IdentityState, A, Runtime> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		instantiate: () => module,
	};
}
