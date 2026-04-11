import type { DependencyAPI } from '../api/dependency/api.js';
import type { Compiler } from '../compile/types.js';
import { emptyRuntime, type EmptyRuntime } from '../runtime/empty.js';
import { emptyState, type EmptyState } from '../state/empty.js';
import type { RuntimeSystem } from './types.js';

export type DependencySystem<Name extends string, T> = RuntimeSystem<
	EmptyState,
	DependencyAPI<Name, T>,
	EmptyRuntime
>;

export function createDependencySystem<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencySystem<Name, T> {
	return {
		emptyState: emptyState,

		async createCompiler(): Promise<
			Compiler<DependencyAPI<Name, T>, EmptyRuntime>
		> {
			return {
				api: {
					[`get${name}`]: () => dependency,
				} as DependencyAPI<Name, T>,
				async build(): Promise<EmptyRuntime> {
					return emptyRuntime();
				},
			};
		},
	};
}
