import type { AssertNoOverlap } from '@franklin/lib';
import type {
	API,
	AlgebraExtensionAPI,
	BaseRuntime,
	Extension,
	ExtensionFor,
	ReduceRuntimes,
	Signature,
} from '@franklin/extensibility';
import type { BuildableModule, LiftModule } from './build.js';
import type { InferRuntime, InferSignature } from './infer.js';

export type ModuleSignatures<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferSignature<LiftModule<T[K]>>;
};

export type ModuleRuntimes<T extends readonly BuildableModule[]> = {
	readonly [K in keyof T]: InferRuntime<LiftModule<T[K]>>;
};

export type ExtensionAPIForModules<Modules extends readonly BuildableModule[]> =
	AlgebraExtensionAPI<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

export type ExtensionForModules<Modules extends readonly BuildableModule[]> =
	ExtensionFor<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

type AssertSignatureListNoOverlap<
	Signatures extends readonly Signature[],
	Runtime extends BaseRuntime,
	Accumulated extends object = Record<never, never>,
> = Signatures extends readonly [
	infer Head extends Signature,
	...infer Tail extends readonly Signature[],
]
	? Runtime extends Head['In']
		? AssertNoOverlap<Accumulated, API<Head, Runtime>> extends never
			? never
			: AssertSignatureListNoOverlap<
					Tail,
					Runtime,
					Accumulated & API<Head, Runtime>
				>
		: never
	: unknown;

type ValidateExtensionTuples<
	Signatures extends readonly Signature[],
	Runtimes extends readonly BaseRuntime[],
> = [ReduceRuntimes<Runtimes>] extends [never]
	? never
	: ReduceRuntimes<Runtimes> extends infer Runtime extends BaseRuntime
		? AssertSignatureListNoOverlap<Signatures, Runtime> extends never
			? never
			: unknown
		: never;

type ExtensionInputForModules<Modules extends readonly BuildableModule[]> =
	ExtensionForModules<Modules> &
		ValidateExtensionTuples<ModuleSignatures<Modules>, ModuleRuntimes<Modules>>;

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
