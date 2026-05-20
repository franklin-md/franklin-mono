import {
	liftRuntimeFactory,
	type RuntimeModule,
} from '../../modules/simple/transform/runtime.js';
import { createDependencyRuntime, type DependencyRuntime } from './runtime.js';

export type DependencyModule<Name extends string, T> = RuntimeModule<
	DependencyRuntime<Name, T>
>;

export function createDependencyModule<Name extends string, T>(
	name: Name,
	dependency: T,
): DependencyModule<Name, T> {
	return liftRuntimeFactory(() => createDependencyRuntime(name, dependency));
}
