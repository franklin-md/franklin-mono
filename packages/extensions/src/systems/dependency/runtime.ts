import type { BaseRuntime } from '../../algebra/runtime/types.js';
import type { EmptyState } from '../empty/index.js';
import { emptyRuntime } from '../empty/index.js';

export type DependencyRuntime<
	Name extends string,
	T,
> = BaseRuntime<EmptyState> & {
	readonly [K in Name]: T;
};

export function createDependencyRuntime<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencyRuntime<Name, T> {
	return {
		...emptyRuntime(),
		[name]: dependency,
	} as DependencyRuntime<Name, T>;
}
