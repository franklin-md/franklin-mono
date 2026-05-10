import type { AssertNoOverlap } from '@franklin/lib';
import type { BoundAPI, ComposeAPI } from '../../algebra/api/index.js';
import { combine as combineCompilers } from '../../algebra/compiler/combine.js';
import type {
	CombinedRuntime,
	RuntimeExtras,
	StateHandle,
} from '../../algebra/runtime/index.js';
import type {
	InferAPI,
	InferCompiler,
	InferRuntime,
	InferState,
} from './infer.js';
import type { BaseHarnessModule, HarnessModule } from './module.js';

// ---------------------------------------------------------------------------
// Pairwise combine
// ---------------------------------------------------------------------------

export type CombineModules<
	Sys1 extends BaseHarnessModule,
	Sys2 extends BaseHarnessModule,
> = HarnessModule<
	InferState<Sys1> & InferState<Sys2>,
	ComposeAPI<InferAPI<Sys1>, InferAPI<Sys2>>,
	CombinedRuntime<InferRuntime<Sys1>, InferRuntime<Sys2>>
>;

type CombinedRuntimeOf<
	Sys1 extends BaseHarnessModule,
	Sys2 extends BaseHarnessModule,
> = CombinedRuntime<InferRuntime<Sys1>, InferRuntime<Sys2>>;

type RuntimeExtrasOf<Sys extends BaseHarnessModule> = RuntimeExtras<
	InferRuntime<Sys>
>;

export type CombinableModule<
	A extends BaseHarnessModule,
	B extends BaseHarnessModule,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<
		BoundAPI<InferAPI<A>, CombinedRuntimeOf<A, B>>,
		BoundAPI<InferAPI<B>, CombinedRuntimeOf<A, B>>
	> &
	AssertNoOverlap<RuntimeExtrasOf<A>, RuntimeExtrasOf<B>>;

/**
 * Combine two `HarnessModule`s by merging their empty states, delegating
 * compiler composition to the compiler-level `combine`, and composing
 * the per-module `state(runtime)` projections by spreading their results.
 */
export function combine<
	RTS1 extends BaseHarnessModule,
	RTS2 extends BaseHarnessModule,
>(
	module1: RTS1,
	module2: RTS2 & CombinableModule<RTS1, RTS2>,
): CombineModules<RTS1, RTS2> {
	type S = InferState<RTS1> & InferState<RTS2>;
	type RT = InferRuntime<CombineModules<RTS1, RTS2>>;

	return {
		emptyState() {
			return {
				...module1.emptyState(),
				...module2.emptyState(),
			} as never;
		},

		createCompiler(state) {
			const c1 = module1.createCompiler(
				state as InferState<RTS1>,
			) as InferCompiler<RTS1>;
			const c2 = module2.createCompiler(
				state as InferState<RTS2>,
			) as InferCompiler<RTS2>;
			return combineCompilers(c1, c2 as never) as never;
		},

		state(runtime: RT): StateHandle<S> {
			const h1 = module1.state(runtime as never) as StateHandle<
				InferState<RTS1>
			>;
			const h2 = module2.state(runtime as never) as StateHandle<
				InferState<RTS2>
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
	};
}

// ---------------------------------------------------------------------------
// Tuple fold
// ---------------------------------------------------------------------------

/**
 * Right-fold `CombineModules` over a tuple of modules. Use this anywhere a
 * single combined module type is needed but the input is naturally a list:
 *
 *   type FranklinModule = Modules<[CoreModule, StoreModule, EnvironmentModule]>;
 *
 * Pairwise overlap rejection is enforced by the `combineAll` runtime fn.
 */
export type Modules<T extends readonly BaseHarnessModule[]> =
	T extends readonly [infer Head extends BaseHarnessModule]
		? Head
		: T extends readonly [
					infer Head extends BaseHarnessModule,
					...infer Tail extends readonly BaseHarnessModule[],
			  ]
			? CombineModules<Head, Modules<Tail>>
			: never;

/**
 * Validates a tuple of modules pairwise: each successive module must be
 * combinable with the running fold of all earlier modules. Used as
 * `T & ValidateModules<T>` in `combineAll`'s signature so call-site errors
 * land on the offending tuple element rather than at the fold call.
 */
export type ValidateModules<
	T extends readonly BaseHarnessModule[],
	Acc extends BaseHarnessModule | null = null,
> = T extends readonly [
	infer Head extends BaseHarnessModule,
	...infer Tail extends readonly BaseHarnessModule[],
]
	? readonly [
			Acc extends BaseHarnessModule ? Head & CombinableModule<Acc, Head> : Head,
			...ValidateModules<
				Tail,
				Acc extends BaseHarnessModule ? CombineModules<Acc, Head> : Head
			>,
		]
	: T;

/**
 * Fold `combine` over a tuple of harness modules. The signature accepts
 * `modules: T & ValidateModules<T>`, which routes each pairwise overlap
 * error onto the offending tuple element rather than the fold call site.
 */
export function combineAll<T extends readonly BaseHarnessModule[]>(
	modules: readonly [...T] & ValidateModules<T>,
): Modules<T> {
	const [head, ...rest] = modules as readonly BaseHarnessModule[];
	if (head === undefined) {
		throw new Error('combineAll requires at least one module');
	}
	let acc: BaseHarnessModule = head;
	for (const next of rest) {
		acc = combine(acc, next as never);
	}
	return acc as Modules<T>;
}
