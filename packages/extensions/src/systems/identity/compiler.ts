import type { Compiler } from '../../algebra/compiler/types.js';
import { type IdentityAPI, identityAPI } from './api.js';
import { type IdentityRuntime, identityRuntime } from './runtime.js';

export type IdentityCompiler = Compiler<IdentityAPI, IdentityRuntime>;

export function identityCompiler(): IdentityCompiler {
	const api = identityAPI();
	return {
		register: (use) => {
			use(api);
		},
		build: async (_getRuntime): Promise<IdentityRuntime> => identityRuntime(),
	};
}
