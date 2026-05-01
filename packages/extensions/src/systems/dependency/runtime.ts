import type { BaseRuntime } from '../../algebra/runtime/types.js';
import { identityRuntime } from '../identity/runtime.js';

export type DependencyRuntime<Name extends string, T> = BaseRuntime & {
	readonly [K in Name]: T;
};

export function createDependencyRuntime<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencyRuntime<Name, T> {
	return {
		...identityRuntime(),
		[name]: dependency,
	} as DependencyRuntime<Name, T>;
}
