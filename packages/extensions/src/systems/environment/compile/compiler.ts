import type { ReconfigurableEnvironment } from '../api/types.js';
import type { EnvironmentAPI } from '../api/api.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { EnvironmentState } from '../state.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime.js';

/**
 * Direct compiler for an already-constructed environment (used in tests
 * or callers that supply their own env without going through the system
 * factory). The api is empty; the env is wrapped at build time.
 */
export function createEnvironmentCompiler(
	environment: ReconfigurableEnvironment,
): Compiler<EnvironmentAPI, EnvironmentState, EnvironmentRuntime> {
	return {
		api: {},
		async build() {
			return createEnvironmentRuntime(environment);
		},
	};
}
