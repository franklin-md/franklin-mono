import { createExtension as createAlgebraExtension } from '../../algebra/extension/index.js';
import type {
	Extension,
	ExtensionFor,
	ExtensionInput,
} from '../../algebra/extension/types.js';
import type { InferAPI, InferRuntime } from './infer.js';
import type { BaseHarnessModule } from './module.js';

type ModuleAPIs<T extends readonly BaseHarnessModule[]> = {
	readonly [K in keyof T]: InferAPI<T[K]>;
};

type ModuleRuntimes<T extends readonly BaseHarnessModule[]> = {
	readonly [K in keyof T]: InferRuntime<T[K]>;
};

/**
 * Harness counterpart to `algebra/createExtension`. Takes a tuple of
 * `HarnessModule`s and infers the API + runtime tuples for the algebra
 * version.
 */
export function createExtension<
	Modules extends readonly BaseHarnessModule[],
>(): (
	extension: ExtensionInput<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>,
) => ExtensionFor<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

export function createExtension<Modules extends readonly BaseHarnessModule[]>(
	extension: ExtensionInput<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>,
): ExtensionFor<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

export function createExtension(extension?: Extension<never>): unknown {
	return createAlgebraExtension(extension as never);
}
