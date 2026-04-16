import type { DependencyAPI } from './api.js';
import type { Compiler } from '../../algebra/compiler/types.js';
import { emptyRuntime, type EmptyRuntime } from '../empty/runtime.js';
import { emptyState, type EmptyState } from '../empty/state.js';
import type { RuntimeSystem } from '../../algebra/system/types.js';

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
