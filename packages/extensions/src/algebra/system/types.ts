import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type { BaseRuntime, CombinedRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';

/**
 * A `RuntimeSystem` exposes a fresh `Compiler` per `createCompiler()` —
 * no state needed yet; state is threaded in at `build` time. The
 * compiler's `Runtime` type is what handlers receive via `ctx.runtime`
 * and what `compileAll` eventually ties via the Y-combinator.
 */
export type RuntimeSystem<
	S extends BaseState,
	API extends BaseAPI,
	Runtime extends BaseRuntime<S>,
> = {
	emptyState(): S;
	createCompiler(): Compiler<API, S, Runtime>;
};

export type BaseRuntimeSystem = RuntimeSystem<any, any, any>;

// ---------------------------------------------------------------------------
// Inference helpers
// ---------------------------------------------------------------------------

type InferSystem<T> =
	T extends RuntimeSystem<
		infer S extends BaseState,
		infer API extends BaseAPI,
		infer Runtime
	>
		? Runtime extends BaseRuntime<S>
			? {
					state: S;
					api: API;
					runtime: Runtime;
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
	InferSystem<T>['state'],
	InferSystem<T>['runtime']
>;

export type InferState<T> = Simplify<InferSystem<T>['state']>;

export type InferAPI<T> = Simplify<InferSystem<T>['api']>;

export type InferRuntime<T> = InferSystem<T>['runtime'];

type RuntimeExtrasOf<Sys extends BaseRuntimeSystem> = Omit<
	InferRuntime<Sys>,
	keyof BaseRuntime<InferState<Sys>>
>;

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

export type CombinableSystem<
	A extends BaseRuntimeSystem,
	B extends BaseRuntimeSystem,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<InferAPI<A>, InferAPI<B>> &
	AssertNoOverlap<RuntimeExtrasOf<A>, RuntimeExtrasOf<B>>;
