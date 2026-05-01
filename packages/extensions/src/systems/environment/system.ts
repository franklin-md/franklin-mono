import { compilerFromApi } from '../../algebra/compiler/from-api.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { EnvironmentAPI, EnvironmentAPISurface } from './api/api.js';
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

export type EnvironmentSystem = RuntimeSystem<
	EnvironmentState,
	EnvironmentAPI,
	EnvironmentRuntime
>;

/**
 * Environment constructs the env at **build** time. The api surface is
 * empty — `getEnvironment()` is gone; extensions access env via
 * `ctx.runtime.environment.*`.
 */
export function createEnvironmentSystem(
	factory: EnvironmentFactory,
): EnvironmentSystem {
	return {
		emptyState: emptyEnvironmentState,

		state: environmentStateHandle,

		createCompiler(state): Compiler<EnvironmentAPI, EnvironmentRuntime> {
			const api: EnvironmentAPISurface = {};
			return compilerFromApi(api, async () => {
				const env = await factory(state.env);
				return createEnvironmentRuntime(env);
			});
		},
	};
}
