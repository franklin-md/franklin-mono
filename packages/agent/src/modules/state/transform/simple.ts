import type { Signature } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import { identityState, identityStateHandle } from '../identity.js';
import type { IdentityState, StateExtensionModule } from '../types.js';

export function fromSimpleModule<
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
