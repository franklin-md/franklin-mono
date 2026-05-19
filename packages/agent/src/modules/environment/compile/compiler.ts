import type { Compiler } from '@franklin/extensibility';
import type { IdentitySignature } from '@franklin/extensibility/module';
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
