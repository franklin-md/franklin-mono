import type { Environment } from '../../api/environment/types.js';
import type { EnvironmentAPI } from '../../api/environment/api.js';
import type { Compiler } from '../types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../../runtime/environment.js';

/**
 * Create a compiler that provides an Environment to extensions.
 *
 * Unlike CoreCompiler (where extensions register handlers) or
 * StoreCompiler (where extensions register stores), the environment
 * compiler is a **provider**: extensions consume the environment via
 * `api.getEnvironment()`, they don't contribute to it.
 */
export function createEnvironmentCompiler(
	environment: Environment & { dispose(): Promise<void> },
): Compiler<EnvironmentAPI, EnvironmentRuntime> {
	return {
		api: {
			getEnvironment: () => environment,
		},
		async build() {
			return createEnvironmentRuntime(environment);
		},
	};
}
