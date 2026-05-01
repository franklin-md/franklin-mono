import { compilerFromApi } from '../../algebra/compiler/from-api.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import { type IdentityAPI, identityAPI } from '../identity/api.js';
import { identityStateHandle } from '../identity/runtime.js';
import { type IdentityState, identityState } from '../identity/state.js';
import { createDependencyRuntime, type DependencyRuntime } from './runtime.js';

export type DependencySystem<Name extends string, T> = RuntimeSystem<
	IdentityState,
	IdentityAPI,
	DependencyRuntime<Name, T>
>;

export function createDependencySystem<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencySystem<Name, T> {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler(): Compiler<IdentityAPI, DependencyRuntime<Name, T>> {
			const api = identityAPI();
			return compilerFromApi(api, async () =>
				createDependencyRuntime(name, dependency),
			);
		},
	};
}
