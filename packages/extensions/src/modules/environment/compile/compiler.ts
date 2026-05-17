import type { Compiler } from '../../../algebra/compiler/types.js';
import type { IdentitySignature } from '../../../algebra/modules/simple/identity.js';
import type { ReconfigurableEnvironment } from '../api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime.js';

export function createEnvironmentCompiler(
	environment: ReconfigurableEnvironment,
): Compiler<IdentitySignature, EnvironmentRuntime> {
	return {
		async compile() {
			return createEnvironmentRuntime(environment);
		},
	};
}
