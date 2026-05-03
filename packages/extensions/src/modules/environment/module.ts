import { compilerFromApi } from '../../algebra/compiler/from-api.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { HarnessModule } from '../../harness/modules/index.js';
import type { IdentityAPI, IdentityAPISurface } from '../identity/api.js';
import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from './api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
	environmentStateHandle,
} from './runtime.js';
import type { EnvironmentState } from './state.js';
import { emptyEnvironmentState } from './state.js';

export type EnvironmentFactory = (
	config: EnvironmentConfig,
) => Promise<ReconfigurableEnvironment>;

export type EnvironmentModule = HarnessModule<
	EnvironmentState,
	IdentityAPI,
	EnvironmentRuntime
>;

export function createEnvironmentModule(
	factory: EnvironmentFactory,
): EnvironmentModule {
	return {
		emptyState: emptyEnvironmentState,

		state: environmentStateHandle,

		createCompiler(state): Compiler<IdentityAPI, EnvironmentRuntime> {
			const api: IdentityAPISurface = {};
			return compilerFromApi(api, async () => {
				const env = await factory(state.env);
				return createEnvironmentRuntime(env);
			});
		},
	};
}
