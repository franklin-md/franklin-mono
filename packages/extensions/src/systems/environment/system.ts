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

export function createEnvironmentSystem(
	factory: EnvironmentFactory,
): EnvironmentSystem {
	return {
		emptyState: emptyEnvironmentState,

		async createCompiler(
			state: EnvironmentState,
		): Promise<Compiler<EnvironmentAPI, EnvironmentRuntime>> {
			const env = await factory(state.env);
			return {
				api: { getEnvironment: () => env },
				async build() {
					return createEnvironmentRuntime(env);
				},
			};
		},
	};
}
