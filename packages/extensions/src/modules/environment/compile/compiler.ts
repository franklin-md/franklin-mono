import type { Compiler } from '../../../algebra/compiler/types.js';
import type { IdentityAPI } from '../../identity/api.js';
import type { ReconfigurableEnvironment } from '../api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime.js';

export function createEnvironmentCompiler(
	environment: ReconfigurableEnvironment,
): Compiler<IdentityAPI, EnvironmentRuntime> {
	return {
		async compile() {
			return createEnvironmentRuntime(environment);
		},
	};
}
