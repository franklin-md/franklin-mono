import type {
	BaseExtensionModule,
	InferRuntime,
	InferSignature,
} from './module.js';
import type {
	Extension,
	ExtensionAPI as AlgebraExtensionAPI,
	ExtensionInput,
} from './extension/types.js';

export type ModuleSignatures<T extends readonly BaseExtensionModule[]> = {
	readonly [K in keyof T]: InferSignature<T[K]>;
};

export type ModuleRuntimes<T extends readonly BaseExtensionModule[]> = {
	readonly [K in keyof T]: InferRuntime<T[K]>;
};

export type ExtensionAPIForModules<
	Modules extends readonly BaseExtensionModule[],
> = AlgebraExtensionAPI<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

export type ExtensionAPI<Modules extends readonly BaseExtensionModule[]> =
	ExtensionAPIForModules<Modules>;

export type ExtensionForModules<
	Modules extends readonly BaseExtensionModule[],
> = Extension<ExtensionAPIForModules<Modules>>;

type ExtensionInputForModules<Modules extends readonly BaseExtensionModule[]> =
	ExtensionInput<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

export function defineExtension<
	Modules extends readonly BaseExtensionModule[],
>(): (
	extension: ExtensionInputForModules<Modules>,
) => ExtensionForModules<Modules>;

export function defineExtension<Modules extends readonly BaseExtensionModule[]>(
	extension: ExtensionInputForModules<Modules>,
): ExtensionForModules<Modules>;

export function defineExtension(extension?: Extension<never>): unknown {
	if (extension !== undefined) return extension;
	return (next: Extension<never>) => next;
}
