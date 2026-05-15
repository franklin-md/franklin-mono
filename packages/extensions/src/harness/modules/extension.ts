import { createExtension as createAlgebraExtension } from '../../algebra/extension/index.js';
import type {
	Extension,
	ExtensionAPISurface,
	ExtensionInput,
} from '../../algebra/extension/types.js';
import type {
	BuildableModule,
	InferAPI,
	InferRuntime,
	LiftModule,
} from '../../algebra/modules/state/index.js';

export type ModuleAPIs<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferAPI<LiftModule<T[K]>>;
};

export type ModuleRuntimes<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferRuntime<LiftModule<T[K]>>;
};

export type ExtensionApi<Modules extends readonly BuildableModule[]> =
	ExtensionAPISurface<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

export type ExtensionForModules<Modules extends readonly BuildableModule[]> =
	Extension<ExtensionApi<Modules>>;

type ExtensionInputForModules<Modules extends readonly BuildableModule[]> =
	ExtensionInput<ModuleAPIs<Modules>, ModuleRuntimes<Modules>>;

/**
 * Authoring counterpart to `algebra/createExtension`. Takes a tuple of
 * extension modules and infers the API + runtime tuples for the algebra
 * version.
 */
export function defineExtension<Modules extends readonly BuildableModule[]>(): (
	extension: ExtensionInputForModules<Modules>,
) => ExtensionForModules<Modules>;

export function defineExtension<Modules extends readonly BuildableModule[]>(
	extension: ExtensionInputForModules<Modules>,
): ExtensionForModules<Modules>;

export function defineExtension(extension?: Extension<never>): unknown {
	return createAlgebraExtension(extension as never);
}
