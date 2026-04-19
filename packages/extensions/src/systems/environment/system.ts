import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from './api/types.js';
import type { EnvironmentAPI } from './api/api.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import type { EnvironmentState } from './state.js';
import { emptyEnvironmentState } from './state.js';
import {
	createEnvironmentRuntime,
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

		createCompiler(): Compiler<
			EnvironmentAPI,
			EnvironmentState,
			EnvironmentRuntime
		> {
			return {
				api: {},
				async build(state) {
					const env = await factory(state.env);
					return createEnvironmentRuntime(env);
				},
			};
		},
	};
}
