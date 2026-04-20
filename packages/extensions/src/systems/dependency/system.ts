import type { Compiler } from '../../algebra/compiler/index.js';
import type { RuntimeSystem } from '../../algebra/system/index.js';
import { emptyAPI, type EmptyAPI } from '../empty/index.js';
import { emptyState, type EmptyState } from '../empty/index.js';
import { createDependencyRuntime, type DependencyRuntime } from './runtime.js';

export type DependencySystem<Name extends string, T> = RuntimeSystem<
	EmptyState,
	EmptyAPI,
	DependencyRuntime<Name, T>
>;

export function createDependencySystem<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencySystem<Name, T> {
	return {
		emptyState,
		createCompiler(): Compiler<
			EmptyAPI,
			EmptyState,
			DependencyRuntime<Name, T>
		> {
			return {
				api: emptyAPI(),
				async build() {
					return createDependencyRuntime(name, dependency);
				},
			};
		},
	};
}
