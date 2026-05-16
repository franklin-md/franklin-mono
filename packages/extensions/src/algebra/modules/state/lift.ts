import type { Signature } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { ExtensionModule } from '../simple/index.js';
import { identityState, identityStateHandle } from './identity.js';
import type { IdentityState, StateExtensionModule } from './types.js';

export function liftExtensionModule<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	module: ExtensionModule<S, Runtime>,
): StateExtensionModule<IdentityState, S, Runtime> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		instantiate: () => module,
	};
}
