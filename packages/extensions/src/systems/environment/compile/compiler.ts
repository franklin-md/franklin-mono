import type { ReconfigurableEnvironment } from '../api/types.js';
import type { EnvironmentAPI } from '../api/api.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime.js';

/**
 * Create a compiler that provides an Environment to extensions.
 *
 * Unlike CoreCompiler (where extensions register handlers) or
 * StoreCompiler (where extensions register stores), the environment
 * compiler is a **provider**: extensions consume the environment via
 * `api.getEnvironment()`, they don't contribute to it.
 */
export function createEnvironmentCompiler(
	environment: ReconfigurableEnvironment,
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
