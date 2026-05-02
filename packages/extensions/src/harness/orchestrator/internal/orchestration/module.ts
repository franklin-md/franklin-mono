import { compilerFromApi } from '../../../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../../../algebra/runtime/index.js';
import type { HarnessModule } from '../../../modules/index.js';
import type { IdentityAPI } from '../../../../modules/identity/api.js';
import { identityAPI } from '../../../../modules/identity/api.js';
import {
	identityRuntime,
	identityStateHandle,
} from '../../../../modules/identity/runtime.js';
import type { IdentityState } from '../../../../modules/identity/state.js';
import { identityState } from '../../../../modules/identity/state.js';
import type { OrchestratorHandle } from '../../types.js';
import type { OrchestrationRuntime } from './runtime.js';

export type OrchestrationModule<Runtime extends BaseRuntime> = HarnessModule<
	IdentityState,
	IdentityAPI,
	OrchestrationRuntime<Runtime>
>;

export function createOrchestrationModule<Runtime extends BaseRuntime>(
	getHandle: () => OrchestratorHandle<Runtime>,
): OrchestrationModule<Runtime> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler() {
			const api = identityAPI();
			return compilerFromApi(api, async () => ({
				...identityRuntime(),
				orchestrator: getHandle(),
			}));
		},
	};
}
