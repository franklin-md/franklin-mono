import type { Compiler } from '../../algebra/compiler/types.js';
import type { IdentityAPI } from './api.js';
import { type IdentityRuntime, identityRuntime } from './runtime.js';

export type IdentityCompiler = Compiler<IdentityAPI, IdentityRuntime>;

export function identityCompiler(): IdentityCompiler {
	return {
		async compile() {
			return identityRuntime();
		},
	};
}
