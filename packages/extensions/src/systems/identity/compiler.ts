import type { Compiler } from '../../algebra/compiler/types.js';
import { identityAPI, type IdentityAPISurface } from './api.js';
import { identityRuntime, type IdentityRuntime } from './runtime.js';

export type IdentityCompiler = Compiler<IdentityAPISurface, IdentityRuntime>;

export function identityCompiler(): IdentityCompiler {
	return {
		api: identityAPI(),
		async build(_getRuntime): Promise<IdentityRuntime> {
			return identityRuntime();
		},
	};
}
