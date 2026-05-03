import { createExtension as createAlgebraExtension } from '../../algebra/extension/index.js';
import type {
	Extension,
	ExtensionAPISurface,
	ExtensionInput,
} from '../../algebra/extension/types.js';
import type { InferAPI, InferRuntime } from './infer.js';
import type { BaseHarnessModule } from './module.js';

export type ModuleAPIs<T extends readonly BaseHarnessModule[]> = {
	readonly [K in keyof T]: InferAPI<T[K]>;
};

export type ModuleRuntimes<T extends readonly BaseHarnessModule[]> = {
	readonly [K in keyof T]: InferRuntime<T[K]>;
};

export type ExtensionApi<Modules extends readonly BaseHarnessModule[]> =
	ExtensionAPISurface<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

export type ExtensionForModules<Modules extends readonly BaseHarnessModule[]> =
	Extension<ExtensionApi<Modules>>;

type ExtensionInputForModules<Modules extends readonly BaseHarnessModule[]> =
	ExtensionInput<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

/**
 * Authoring counterpart to `algebra/createExtension`. Takes a tuple of
 * `HarnessModule`s and infers the API + runtime tuples for the algebra
 * version.
 */
export function defineExtension<
	Modules extends readonly BaseHarnessModule[],
>(): (
	extension: ExtensionInputForModules<Modules>,
) => ExtensionForModules<Modules>;

export function defineExtension<Modules extends readonly BaseHarnessModule[]>(
	extension: ExtensionInputForModules<Modules>,
): ExtensionForModules<Modules>;

export function defineExtension(extension?: Extension<never>): unknown {
	return createAlgebraExtension(extension as never);
}
