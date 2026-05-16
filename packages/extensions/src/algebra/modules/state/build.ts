import type {
	BaseExtensionModule,
	InferAPI as InferSimpleAPI,
	InferRuntime as InferSimpleRuntime,
} from '../simple/index.js';
import {
	combineAll,
	type CombinableModule,
	type CombineModules,
	type Modules,
} from './combine.js';
import { fromSimpleModule } from './transform/index.js';
import type {
	BaseStateExtensionModule,
	IdentityState,
	StateExtensionModule,
} from './types.js';

export type BuildableModule = BaseStateExtensionModule | BaseExtensionModule;

export type LiftModule<Module extends BuildableModule> =
	Module extends BaseStateExtensionModule
		? Module
		: Module extends BaseExtensionModule
			? StateExtensionModule<
					IdentityState,
					InferSimpleAPI<Module>,
					InferSimpleRuntime<Module>
				>
			: never;

export type LiftModules<T extends readonly BuildableModule[]> =
	T extends readonly [
		infer Head extends BuildableModule,
		...infer Tail extends readonly BuildableModule[],
	]
		? readonly [LiftModule<Head>, ...LiftModules<Tail>]
		: readonly [];

export type BuildModules<T extends readonly BuildableModule[]> = Modules<
	LiftModules<T>
>;

export type CombinableBuildModule<
	Module1 extends BuildableModule,
	Module2 extends BuildableModule,
> = CombinableModule<LiftModule<Module1>, LiftModule<Module2>>;

export type ValidateBuildModules<
	T extends readonly BuildableModule[],
	Acc extends BaseStateExtensionModule | null = null,
> = T extends readonly [
	infer Head extends BuildableModule,
	...infer Tail extends readonly BuildableModule[],
]
	? readonly [
			Acc extends BaseStateExtensionModule
				? Head & CombinableModule<Acc, LiftModule<Head>>
				: Head,
			...ValidateBuildModules<
				Tail,
				Acc extends BaseStateExtensionModule
					? CombineModules<Acc, LiftModule<Head>>
					: LiftModule<Head>
			>,
		]
	: T;

function isStateExtensionModule(
	module: BuildableModule,
): module is BaseStateExtensionModule {
	return 'instantiate' in module;
}

export function liftBuildModule<Module extends BuildableModule>(
	module: Module,
): LiftModule<Module> {
	return (
		isStateExtensionModule(module) ? module : fromSimpleModule(module)
	) as LiftModule<Module>;
}

export function buildStateExtensionModule<T extends readonly BuildableModule[]>(
	modules: readonly [...T] & ValidateBuildModules<T>,
): BuildModules<T> {
	const lifted = modules.map((module) =>
		liftBuildModule(module),
	) as unknown as LiftModules<T>;
	return combineAll(lifted as never) as BuildModules<T>;
}
