import type { HarnessModule } from '../../harness/modules/module.js';
import { identityCompiler, type IdentityCompiler } from './compiler.js';
import type { IdentityAPI } from './api.js';
import { identityState, type IdentityState } from './state.js';
import { identityStateHandle, type IdentityRuntime } from './runtime.js';

export type IdentityModule = HarnessModule<
	IdentityState,
	IdentityAPI,
	IdentityRuntime
>;

export function identityModule(): IdentityModule {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler(): IdentityCompiler {
			return identityCompiler();
		},
	};
}
