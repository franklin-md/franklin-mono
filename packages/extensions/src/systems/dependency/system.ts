import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import { identityAPI, type IdentityAPI } from '../identity/api.js';
import { identityState, type IdentityState } from '../identity/state.js';
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
		createCompiler(): Compiler<
			IdentityAPI,
			IdentityState,
			DependencyRuntime<Name, T>
		> {
			return {
				api: identityAPI(),
				async build() {
					return createDependencyRuntime(name, dependency);
				},
			};
		},
	};
}
