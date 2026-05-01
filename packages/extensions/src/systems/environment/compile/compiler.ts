import type { Compiler } from '../../../algebra/compiler/types.js';
import type { EnvironmentAPI, EnvironmentAPISurface } from '../api/api.js';
import type { ReconfigurableEnvironment } from '../api/types.js';
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
): Compiler<EnvironmentAPI, EnvironmentRuntime> {
	const api: EnvironmentAPISurface = {};
	return {
		register: (use) => {
			use(api);
		},
		build: async () => createEnvironmentRuntime(environment),
	};
}
