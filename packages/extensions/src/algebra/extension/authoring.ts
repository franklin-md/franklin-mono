import type {
	BuildableModule,
	InferRuntime,
	InferSignature,
	LiftModule,
} from '../modules/state/index.js';
import type { Extension, ExtensionAPI, ExtensionInput } from './types.js';

// TODO: Switch from BuildableModule to a regular module type once every module
// system guarantees both module.ts and state-module.ts entry points.
export type ModuleSignatures<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferSignature<LiftModule<T[K]>>;
};

export type ModuleRuntimes<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferRuntime<LiftModule<T[K]>>;
};

export type ExtensionAPIForModules<Modules extends readonly BuildableModule[]> =
	ExtensionAPI<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

export type ExtensionForModules<Modules extends readonly BuildableModule[]> =
	Extension<ExtensionAPIForModules<Modules>>;

type ExtensionInputForModules<Modules extends readonly BuildableModule[]> =
	ExtensionInput<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

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
