import { compilerFromApi } from '../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { HarnessModule } from '../modules/index.js';
import type { OrchestratorHandle } from './types.js';
import type { IdentityAPI } from '../../modules/identity/api.js';
import { identityAPI } from '../../modules/identity/api.js';
import {
	identityRuntime,
	identityStateHandle,
} from '../../modules/identity/runtime.js';
import type { IdentityState } from '../../modules/identity/state.js';
import { identityState } from '../../modules/identity/state.js';

export type SelfRuntime = BaseRuntime & {
	readonly self: {
		readonly id: string;
	};
};

export type OrchestratorInternalRuntime<Runtime extends BaseRuntime> =
	SelfRuntime & {
		readonly orchestrator: OrchestratorHandle<Runtime>;
	};

export type OrchestratorInternalModule<Runtime extends BaseRuntime> =
	HarnessModule<
		IdentityState,
		IdentityAPI,
		OrchestratorInternalRuntime<Runtime>
	>;

export function createOrchestratorInternalModule<Runtime extends BaseRuntime>(
	getHandle: () => OrchestratorHandle<Runtime>,
): OrchestratorInternalModule<Runtime> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler(input) {
			const api = identityAPI();
			return compilerFromApi(api, async () => ({
				...identityRuntime(),
				self: { id: input.id },
				orchestrator: getHandle(),
			}));
		},
	};
}
