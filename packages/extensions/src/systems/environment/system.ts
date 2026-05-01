import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from './api/types.js';
import type { EnvironmentAPI, EnvironmentAPISurface } from './api/api.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { EnvironmentState } from './state.js';
import { emptyEnvironmentState } from './state.js';
import {
	createEnvironmentRuntime,
	environmentStateHandle,
	type EnvironmentRuntime,
} from './runtime.js';

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

		createCompiler(state): Compiler<EnvironmentAPISurface, EnvironmentRuntime> {
			return {
				api: {},
				async build() {
					const env = await factory(state.env);
					return createEnvironmentRuntime(env);
				},
			};
		},
	};
}
