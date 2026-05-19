import { createExtensionPoint } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility';
import type { IdentitySignature } from '@franklin/extensibility';
import { createDependencyRuntime, type DependencyRuntime } from './runtime.js';

export type DependencyModule<Name extends string, T> = ExtensionModule<
	IdentitySignature,
	DependencyRuntime<Name, T>
>;

const identityExtensionPoint = createExtensionPoint<IdentitySignature>({});

export function createDependencyModule<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencyModule<Name, T> {
	return {
		extensionPoint: identityExtensionPoint,
		compiler: {
			async compile() {
				return createDependencyRuntime(name, dependency);
			},
		},
	};
}
