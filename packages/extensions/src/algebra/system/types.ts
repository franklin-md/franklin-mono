import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type { Compiler } from '../compiler/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
	StateHandle,
} from '../runtime/index.js';
import type { BaseState } from '../state/index.js';

/**
 * A `RuntimeSystem` owns three things:
 *  - `emptyState()` — the initial state shape for the system
 *  - `createCompiler(state)` — given configured state, hand back a
 *    state-free compiler that registers extensions and builds the runtime
 *  - `state(runtime)` — the `Runtime → StateHandle<S>` projection. Each
 *    system stashes its handle on the runtime via a private symbol; this
 *    projection reads it back. The runtime type itself never references
 *    `<S>`.
 */
export type RuntimeSystem<
	S extends BaseState,
	API extends BaseAPI,
	Runtime extends BaseRuntime,
> = {
	emptyState(): S;
	createCompiler(state: S): Compiler<API, Runtime>;
	state(runtime: Runtime): StateHandle<S>;
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
		? Runtime extends BaseRuntime
			? {
					state: S;
					api: API;
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

export type InferCompiler<T> = Compiler<
	InferSystem<T>['api'],
	InferSystem<T>['runtime']
>;

export type InferState<T> = Simplify<InferSystem<T>['state']>;

export type InferAPI<T> = Simplify<InferSystem<T>['api']>;

export type InferRuntime<T> = InferSystem<T>['runtime'];

type RuntimeExtrasOf<Sys extends BaseRuntimeSystem> = RuntimeExtras<
	InferRuntime<Sys>
>;

export type CombineSystems<
	Sys1 extends BaseRuntimeSystem,
	Sys2 extends BaseRuntimeSystem,
> = RuntimeSystem<
	InferState<Sys1> & InferState<Sys2>,
	InferAPI<Sys1> & InferAPI<Sys2>,
	CombinedRuntime<InferRuntime<Sys1>, InferRuntime<Sys2>>
>;

export type CombinableSystem<
	A extends BaseRuntimeSystem,
	B extends BaseRuntimeSystem,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<InferAPI<A>, InferAPI<B>> &
	AssertNoOverlap<RuntimeExtrasOf<A>, RuntimeExtrasOf<B>>;
