import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type { BaseRuntime, CombinedRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';

export type RuntimeSystem<
	S extends BaseState,
	API extends BaseAPI,
	RT extends BaseRuntime<S>,
> = {
	emptyState(): S;
	createCompiler(state: S): Promise<Compiler<API, RT>>;
};

/**
 * Type-erased `RuntimeSystem` for use in generic constraints.
 *
 * Equivalent to `RuntimeSystem<any, any, any>` — use it when a signature
 * accepts "any runtime system" without caring about its specific state,
 * API, or runtime shape. Prefer this over the raw triple-any so the
 * constraint has a single source of truth if `RuntimeSystem` ever grows
 * another type parameter.
 */
export type BaseRuntimeSystem = RuntimeSystem<any, any, any>;

// ---------------------------------------------------------------------------
// Inference helpers — extract type parameters from a RuntimeSystem or Runtime
// ---------------------------------------------------------------------------

type InferSystem<T> =
	T extends RuntimeSystem<
		infer S extends BaseState,
		infer API extends BaseAPI,
		infer RT
	>
		? RT extends BaseRuntime<S>
			? {
					state: S;
					api: API;
					runtime: RT;
				}
			: never
		: T extends BaseRuntime<infer S>
			? {
					state: S;
					api: never;
					runtime: T;
				}
			: never;

export type InferCompiler<T> = Compiler<
	InferSystem<T>['api'],
	InferSystem<T>['runtime']
>;

export type InferState<T> = Simplify<InferSystem<T>['state']>;

export type InferAPI<T> = Simplify<InferSystem<T>['api']>;

export type InferRuntime<T> = InferSystem<T>['runtime'];

// ---------------------------------------------------------------------------
// Type-level combine — mirrors the value-level `combine` function.
//
// Overlap between state or API keys is rejected via `CombinableSystem` on
// the second operand of `combine()` / `SystemBuilder.add()`, so this type
// is the plain composition without an embedded guard.
// ---------------------------------------------------------------------------

export type CombineSystems<
	Sys1 extends BaseRuntimeSystem,
	Sys2 extends BaseRuntimeSystem,
> = RuntimeSystem<
	InferState<Sys1> & InferState<Sys2>,
	InferAPI<Sys1> & InferAPI<Sys2>,
	CombinedRuntime<
		InferState<Sys1>,
		InferState<Sys2>,
		InferRuntime<Sys1>,
		InferRuntime<Sys2>
	>
>;

/**
 * Type-level predicate asserting that `B` can legally be combined with `A`.
 *
 * Reduces to `unknown` when their top-level state and API keys are disjoint
 * (so `Sys2 & CombinableSystem<Sys1, Sys2>` is just `Sys2`) and to `never`
 * when they overlap (collapsing the intersection). Thread it onto the
 * second operand of a combine-style op to put the error at the call site.
 */
export type CombinableSystem<
	A extends BaseRuntimeSystem,
	B extends BaseRuntimeSystem,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<InferAPI<A>, InferAPI<B>>;
