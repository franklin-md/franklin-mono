import { compilerFromApi } from '../../../../algebra/compiler/index.js';
import type { HarnessModule } from '../../../modules/index.js';
import type { IdentityAPI } from '../../../../modules/identity/api.js';
import { identityAPI } from '../../../../modules/identity/api.js';
import {
	identityRuntime,
	identityStateHandle,
} from '../../../../modules/identity/runtime.js';
import type { IdentityState } from '../../../../modules/identity/state.js';
import { identityState } from '../../../../modules/identity/state.js';
import type { SelfRuntime } from './runtime.js';

export type SelfModule = HarnessModule<IdentityState, IdentityAPI, SelfRuntime>;

export function createSelfModule(id: string): SelfModule {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler() {
			const api = identityAPI();
			return compilerFromApi(api, async () => ({
				...identityRuntime(),
				self: { id },
			}));
		},
	};
}
