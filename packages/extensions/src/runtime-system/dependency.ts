import type { DependencyAPI } from '../api/dependency/api.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeBase } from '../runtime/types.js';
import type { RuntimeSystem } from './types.js';

type DependencyState = Record<never, never>;
type DependencyRuntime = RuntimeBase<DependencyState>;

export type DependencySystem<Name extends string, T> = RuntimeSystem<
	DependencyState,
	DependencyAPI<Name, T>,
	DependencyRuntime
>;

function createDependencyRuntime(): DependencyRuntime {
	return {
		async state(): Promise<DependencyState> {
			return {};
		},
		async fork(): Promise<DependencyState> {
			return {};
		},
		async child(): Promise<DependencyState> {
			return {};
		},
		async dispose(): Promise<void> {},
		subscribe(): () => void {
			return () => {};
		},
	};
}

export function createDependencySystem<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencySystem<Name, T> {
	return {
		emptyState(): DependencyState {
			return {};
		},

		async createCompiler(): Promise<
			Compiler<DependencyAPI<Name, T>, DependencyRuntime>
		> {
			return {
				api: {
					[`get${name}`]: () => dependency,
				} as DependencyAPI<Name, T>,
				async build(): Promise<DependencyRuntime> {
					return createDependencyRuntime();
				},
			};
		},
	};
}
