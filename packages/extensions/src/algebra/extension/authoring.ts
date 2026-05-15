import type {
	BuildableModule,
	InferAPI,
	InferRuntime,
	LiftModule,
} from '../modules/state/index.js';
import type {
	Extension,
	ExtensionAPISurface,
	ExtensionInput,
} from './types.js';

// TODO: Switch from BuildableModule to a regular module type once every module
// system guarantees both module.ts and state-module.ts entry points.
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

export function defineExtension<Modules extends readonly BuildableModule[]>(): (
	extension: ExtensionInputForModules<Modules>,
) => ExtensionForModules<Modules>;

export function defineExtension<Modules extends readonly BuildableModule[]>(
	extension: ExtensionInputForModules<Modules>,
): ExtensionForModules<Modules>;

export function defineExtension(extension?: Extension<never>): unknown {
	if (extension !== undefined) return extension;
	return (next: Extension<never>) => next;
}
