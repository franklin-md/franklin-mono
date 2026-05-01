import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { API, BoundAPI, ComposeAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
	StateHandle,
} from '../runtime/index.js';
import type { BaseState } from '../state/index.js';

declare const SYSTEM_API: unique symbol;

/**
 * A `RuntimeSystem` owns three things:
 *  - `emptyState()` — the initial state shape for the system
 *  - `createCompiler(state)` — given configured state, hand back a
 *    state-free compiler that registers extensions and builds the runtime
 *  - `state(runtime)` — the `Runtime → StateHandle<S>` projection. Each
 *    system stashes its handle on the runtime via a private symbol; this
 *    projection reads it back. The runtime type itself never references
 *    `<S>`.
 *
 * `A` is the system's API as an HKT (`Runtime → APISurface`). Composition
 * substitutes the eventual fully-tied runtime so that runtime-aware APIs
 * (e.g. `CoreAPI`) see the composed runtime.
 */
export type RuntimeSystem<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
> = {
	readonly [SYSTEM_API]?: A;
	emptyState(): S;
	createCompiler(state: S): Compiler<A, Runtime>;
	state(runtime: Runtime): StateHandle<S>;
};

export type BaseRuntimeSystem = RuntimeSystem<any, any, any>;

// ---------------------------------------------------------------------------
// Inference helpers
// ---------------------------------------------------------------------------

type InferSystem<T> =
	T extends RuntimeSystem<
		infer S extends BaseState,
		infer A extends API,
		infer Runtime
	>
		? Runtime extends BaseRuntime
			? {
					state: S;
					api: A;
					runtime: Runtime;
				}
			: never
		: T extends BaseRuntime
			? {
					state: never;
					api: never;
					runtime: T;
				}
			: never;

export type InferAPI<T> = InferSystem<T>['api'];

export type InferCompiler<T> = Compiler<InferAPI<T>, InferSystem<T>['runtime']>;

export type InferState<T> = Simplify<InferSystem<T>['state']>;

export type InferBoundAPI<T> = Simplify<
	BoundAPI<InferAPI<T>, InferSystem<T>['runtime']>
>;

export type InferRuntime<T> = InferSystem<T>['runtime'];

type RuntimeExtrasOf<Sys extends BaseRuntimeSystem> = RuntimeExtras<
	InferRuntime<Sys>
>;

export type CombineSystems<
	Sys1 extends BaseRuntimeSystem,
	Sys2 extends BaseRuntimeSystem,
> = RuntimeSystem<
	InferState<Sys1> & InferState<Sys2>,
	ComposeAPI<InferAPI<Sys1>, InferAPI<Sys2>>,
	CombinedRuntime<InferRuntime<Sys1>, InferRuntime<Sys2>>
>;

type CombinedRuntimeOf<
	Sys1 extends BaseRuntimeSystem,
	Sys2 extends BaseRuntimeSystem,
> = CombinedRuntime<InferRuntime<Sys1>, InferRuntime<Sys2>>;

export type CombinableSystem<
	A extends BaseRuntimeSystem,
	B extends BaseRuntimeSystem,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<
		BoundAPI<InferAPI<A>, CombinedRuntimeOf<A, B>>,
		BoundAPI<InferAPI<B>, CombinedRuntimeOf<A, B>>
	> &
	AssertNoOverlap<RuntimeExtrasOf<A>, RuntimeExtrasOf<B>>;
