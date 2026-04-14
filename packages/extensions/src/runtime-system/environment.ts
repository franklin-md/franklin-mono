import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from '../api/environment/types.js';
import type { EnvironmentAPI } from '../api/environment/api.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeSystem } from './types.js';
import type { EnvironmentState } from '../state/environment.js';
import { emptyEnvironmentState } from '../state/environment.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime/environment.js';

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
