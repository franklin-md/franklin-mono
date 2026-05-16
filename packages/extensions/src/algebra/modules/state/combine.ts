import type { AssertNoOverlap } from '@franklin/lib';
import type { ComposeSignature } from '../../api/index.js';
import type { CombinedRuntime } from '../../runtime/index.js';
import type {
	BinaryType,
	ReduceCompositionTuple,
	ValidateCompositionTuple,
} from '../../../utils/compose-typing.js';
import { reduceNonEmpty } from '../../../utils/reduce-non-empty.js';
import {
	combine as combineSimpleModules,
	type CombinableModule as CombinableSimpleModule,
	type CombineModules as CombineSimpleModules,
} from '../simple/index.js';
import type {
	InferRuntime,
	InferSimpleModule,
	InferSignature,
	InferState,
} from './infer.js';
import type {
	BaseStateExtensionModule,
	StateExtensionModule,
	StateHandle,
} from './types.js';

export type CombineModules<
	Module1 extends BaseStateExtensionModule,
	Module2 extends BaseStateExtensionModule,
> = StateExtensionModule<
	InferState<Module1> & InferState<Module2>,
	ComposeSignature<InferSignature<Module1>, InferSignature<Module2>>,
	CombinedRuntime<InferRuntime<Module1>, InferRuntime<Module2>>
>;

export type CombinableModule<
	Module1 extends BaseStateExtensionModule,
	Module2 extends BaseStateExtensionModule,
> = AssertNoOverlap<InferState<Module1>, InferState<Module2>> &
	CombinableSimpleModule<
		InferSimpleModule<Module1>,
		InferSimpleModule<Module2>
	>;

interface CombineModuleType extends BinaryType {
	readonly In: readonly [unknown, unknown];
	readonly Out: this['In'][0] extends BaseStateExtensionModule
		? this['In'][1] extends BaseStateExtensionModule
			? CombineModules<this['In'][0], this['In'][1]>
			: never
		: never;
}

interface CombinableModuleType extends BinaryType {
	readonly In: readonly [unknown, unknown];
	readonly Out: this['In'][0] extends BaseStateExtensionModule
		? this['In'][1] extends BaseStateExtensionModule
			? CombinableModule<this['In'][0], this['In'][1]>
			: never
		: never;
}

export function combine<
	Module1 extends BaseStateExtensionModule,
	Module2 extends BaseStateExtensionModule,
>(
	module1: Module1,
	module2: Module2 & CombinableModule<Module1, Module2>,
): CombineModules<Module1, Module2> {
	type S = InferState<Module1> & InferState<Module2>;
	type RT = InferRuntime<CombineModules<Module1, Module2>>;

	return {
		emptyState() {
			return {
				...module1.emptyState(),
				...module2.emptyState(),
			} as S;
		},
		state(runtime: RT): StateHandle<S> {
			const h1 = module1.state(runtime as never) as StateHandle<
				InferState<Module1>
			>;
			const h2 = module2.state(runtime as never) as StateHandle<
				InferState<Module2>
			>;
			return {
				get: async () =>
					({
						...(await h1.get()),
						...(await h2.get()),
					}) as S,
				fork: async () =>
					({
						...(await h1.fork()),
						...(await h2.fork()),
					}) as S,
				child: async () =>
					({
						...(await h1.child()),
						...(await h2.child()),
					}) as S,
			};
		},
		instantiate(state: S) {
			return combineSimpleModules(
				module1.instantiate(state as InferState<Module1>),
				module2.instantiate(state as InferState<Module2>) as never,
			) as CombineSimpleModules<
				InferSimpleModule<Module1>,
				InferSimpleModule<Module2>
			>;
		},
	} as never;
}

export type Modules<T extends readonly BaseStateExtensionModule[]> =
	ReduceCompositionTuple<T, BaseStateExtensionModule, CombineModuleType>;

export type ValidateModules<T extends readonly BaseStateExtensionModule[]> =
	ValidateCompositionTuple<
		T,
		BaseStateExtensionModule,
		CombineModuleType,
		CombinableModuleType
	>;

export function combineAll<const T extends readonly BaseStateExtensionModule[]>(
	modules: readonly [...T] & ValidateModules<T>,
): Modules<T> {
	return reduceNonEmpty(
		modules as readonly BaseStateExtensionModule[],
		(acc, next) => combine(acc, next as never),
		'combineAll requires at least one module',
	) as Modules<T>;
}
