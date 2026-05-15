import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { HarnessModule } from '../../harness/modules/module.js';
import type { IdentityAPI } from './api.js';
import { identityCompiler } from './compiler.js';
import { identityStateHandle, type IdentityRuntime } from './runtime.js';
import { identityState, type IdentityState } from './state.js';

export type IdentityModule = HarnessModule<
	IdentityState,
	IdentityAPI,
	IdentityRuntime
>;

const identityExtensionPoint = createExtensionPoint<IdentityAPI>({});

export function identityModule(): IdentityModule {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		instantiate() {
			return {
				extensionPoint: identityExtensionPoint,
				compiler: identityCompiler(),
			};
		},
	};
}
