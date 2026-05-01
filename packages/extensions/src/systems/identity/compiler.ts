import type { Compiler } from '../../algebra/compiler/types.js';
import { identityAPI, type IdentityAPI } from './api.js';
import { identityRuntime, type IdentityRuntime } from './runtime.js';

export type IdentityCompiler = Compiler<IdentityAPI, IdentityRuntime>;

export function identityCompiler(): IdentityCompiler {
	return {
		api: identityAPI(),
		async build(_getRuntime): Promise<IdentityRuntime> {
			return identityRuntime();
		},
	};
}
