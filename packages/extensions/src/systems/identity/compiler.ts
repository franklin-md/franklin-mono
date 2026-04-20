import type { Compiler } from '../../algebra/compiler/types.js';
import { identityAPI, type IdentityAPI } from './api.js';
import { identityRuntime, type IdentityRuntime } from './runtime.js';
import type { IdentityState } from './state.js';

export type IdentityCompiler = Compiler<
	IdentityAPI,
	IdentityState,
	IdentityRuntime
>;

export function identityCompiler(): IdentityCompiler {
	return {
		api: identityAPI(),
		async build(_state, _getRuntime): Promise<IdentityRuntime> {
			return identityRuntime();
		},
	};
}
