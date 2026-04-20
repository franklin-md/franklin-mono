import type { RuntimeSystem } from '../../algebra/system/types.js';
import { identityCompiler, type IdentityCompiler } from './compiler.js';
import type { IdentityAPI } from './api.js';
import { identityState, type IdentityState } from './state.js';
import type { IdentityRuntime } from './runtime.js';

export type IdentitySystem = RuntimeSystem<
	IdentityState,
	IdentityAPI,
	IdentityRuntime
>;

export function identitySystem(): IdentitySystem {
	return {
		emptyState: identityState,
		createCompiler(): IdentityCompiler {
			return identityCompiler();
		},
	};
}
