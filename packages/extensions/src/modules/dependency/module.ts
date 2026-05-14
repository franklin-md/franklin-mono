import type { Compiler } from '../../algebra/compiler/index.js';
import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { HarnessModule } from '../../harness/modules/index.js';
import type { IdentityAPI } from '../identity/api.js';
import { identityStateHandle } from '../identity/runtime.js';
import { type IdentityState, identityState } from '../identity/state.js';
import { createDependencyRuntime, type DependencyRuntime } from './runtime.js';

export type DependencyModule<Name extends string, T> = HarnessModule<
	IdentityState,
	IdentityAPI,
	DependencyRuntime<Name, T>
>;

const identityExtensionPoint = createExtensionPoint<IdentityAPI>({});

export function createDependencyModule<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencyModule<Name, T> {
	return {
		extensionPoint: identityExtensionPoint,
		emptyState: identityState,
		state: () => identityStateHandle(),
		createCompiler(): Compiler<IdentityAPI, DependencyRuntime<Name, T>> {
			return {
				async compile() {
					return createDependencyRuntime(name, dependency);
				},
			};
		},
	};
}
