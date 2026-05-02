import { compilerFromApi } from '../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { HarnessModule } from '../modules/index.js';
import type { OrchestratorHandle } from '../modules/context.js';
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

export type OrchestratorRuntime<Runtime extends BaseRuntime> = BaseRuntime & {
	readonly orchestrator: OrchestratorHandle<Runtime>;
};

export type OrchestratorInternalRuntime<Runtime extends BaseRuntime> =
	SelfRuntime & OrchestratorRuntime<Runtime>;

export type OrchestratorInternalModule<Runtime extends BaseRuntime> =
	HarnessModule<
		IdentityState,
		IdentityAPI,
		OrchestratorInternalRuntime<Runtime>
	>;

export function createOrchestratorInternalModule<
	Runtime extends BaseRuntime,
>(): OrchestratorInternalModule<Runtime> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler(input) {
			const api = identityAPI();
			return compilerFromApi(api, async (_getRuntime) => ({
				...identityRuntime(),
				self: { id: input.id },
				orchestrator: input.getOrchestrator<
					ReturnType<typeof _getRuntime>
				>() as unknown as OrchestratorHandle<Runtime>,
			}));
		},
	};
}
