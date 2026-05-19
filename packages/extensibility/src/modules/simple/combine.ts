import type { AssertNoOverlap } from '@franklin/lib';
import type { API, CombineSignature } from '../../api/index.js';
import { combine as combineCompilers } from '../../compiler/combine.js';
import { combine as combineExtensionPoints } from '../../extension-points/combine.js';
import type { CombinedRuntime, RuntimeExtras } from '../../runtime/index.js';
import type {
	BinaryType,
	ReduceCompositionTuple,
	ValidateCompositionTuple,
} from '../../utils/compose-typing.js';
import { reduceNonEmpty } from '../../utils/reduce-non-empty.js';
import type { InferRuntime, InferSignature } from './infer.js';
import type { BaseExtensionModule, ExtensionModule } from './types.js';

export type CombineModules<
	Module1 extends BaseExtensionModule,
	Module2 extends BaseExtensionModule,
> = ExtensionModule<
	CombineSignature<InferSignature<Module1>, InferSignature<Module2>>,
	CombinedRuntime<InferRuntime<Module1>, InferRuntime<Module2>>
>;

type CombinedRuntimeOf<
	Module1 extends BaseExtensionModule,
	Module2 extends BaseExtensionModule,
> = CombinedRuntime<InferRuntime<Module1>, InferRuntime<Module2>>;

type RuntimeExtrasOf<Module extends BaseExtensionModule> = RuntimeExtras<
	InferRuntime<Module>
>;

export type CombinableModule<
	Module1 extends BaseExtensionModule,
	Module2 extends BaseExtensionModule,
> = AssertNoOverlap<
	API<InferSignature<Module1>, CombinedRuntimeOf<Module1, Module2>>,
	API<InferSignature<Module2>, CombinedRuntimeOf<Module1, Module2>>
> &
	AssertNoOverlap<RuntimeExtrasOf<Module1>, RuntimeExtrasOf<Module2>>;

interface CombineModuleType extends BinaryType {
	readonly In: readonly [unknown, unknown];
	readonly Out: this['In'][0] extends BaseExtensionModule
		? this['In'][1] extends BaseExtensionModule
			? CombineModules<this['In'][0], this['In'][1]>
			: never
		: never;
}

interface CombinableModuleType extends BinaryType {
	readonly In: readonly [unknown, unknown];
	readonly Out: this['In'][0] extends BaseExtensionModule
		? this['In'][1] extends BaseExtensionModule
			? CombinableModule<this['In'][0], this['In'][1]>
			: never
		: never;
}

export function combine<
	Module1 extends BaseExtensionModule,
	Module2 extends BaseExtensionModule,
>(
	module1: Module1,
	module2: Module2 & CombinableModule<Module1, Module2>,
): CombineModules<Module1, Module2> {
	return {
		extensionPoint: combineExtensionPoints(
			module1.extensionPoint,
			module2.extensionPoint,
		),
		compiler: combineCompilers(module1.compiler, module2.compiler as never),
	} as never;
}

export type Modules<T extends readonly BaseExtensionModule[]> =
	ReduceCompositionTuple<T, BaseExtensionModule, CombineModuleType>;

export type ValidateModules<T extends readonly BaseExtensionModule[]> =
	ValidateCompositionTuple<
		T,
		BaseExtensionModule,
		CombineModuleType,
		CombinableModuleType
	>;

export function combineAll<const T extends readonly BaseExtensionModule[]>(
	modules: readonly [...T] & ValidateModules<T>,
): Modules<T> {
	return reduceNonEmpty(
		modules as readonly BaseExtensionModule[],
		(acc, next) => combine(acc, next as never),
		'combineAll requires at least one module',
	) as Modules<T>;
}
