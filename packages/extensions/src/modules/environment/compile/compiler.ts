import { compilerFromApi } from '../../../algebra/compiler/from-api.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type {
	IdentityAPI,
	IdentityAPISurface,
} from '../../identity/api.js';
import type { ReconfigurableEnvironment } from '../api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../runtime.js';

export function createEnvironmentCompiler(
	environment: ReconfigurableEnvironment,
): Compiler<IdentityAPI, EnvironmentRuntime> {
	const api: IdentityAPISurface = {};
	return compilerFromApi(api, async () =>
		createEnvironmentRuntime(environment),
	);
}
