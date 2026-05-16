import type { API } from '../../../api/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModule } from '../../simple/index.js';
import { identityState, identityStateHandle } from '../identity.js';
import type { IdentityState, StateExtensionModule } from '../types.js';

export function fromSimpleModule<
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
