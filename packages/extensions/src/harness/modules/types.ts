import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { API, BoundAPI, ComposeAPI } from '../../algebra/api/index.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
	StateHandle,
} from '../../algebra/runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { HarnessModuleCompilerInput } from './context.js';

declare const MODULE_API: unique symbol;

/**
 * A `HarnessModule` owns three things:
 *  - `emptyState()` — the initial state shape for the module
 *  - `createCompiler(input)` — given configured state and materialization
 *    context, hand back a compiler that registers extensions and builds the
 *    runtime
 *  - `state(runtime)` — the `Runtime → StateHandle<S>` projection. Each
 *    module stashes its handle on the runtime via a private symbol; this
 *    projection reads it back. The runtime type itself never references
 *    `<S>`.
 *
 * `A` is the module's API as an HKT (`Runtime → APISurface`). Composition
 * substitutes the eventual fully-tied runtime so that runtime-aware APIs
 * (e.g. `CoreAPI`) see the composed runtime.
 */
export type HarnessModule<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
> = {
	readonly [MODULE_API]?: A;
	emptyState(): S;
	createCompiler(input: HarnessModuleCompilerInput<S>): Compiler<A, Runtime>;
	state(runtime: Runtime): StateHandle<S>;
};

export type BaseHarnessModule = HarnessModule<any, any, any>;

// ---------------------------------------------------------------------------
// Inference helpers
// ---------------------------------------------------------------------------

type InferModule<T> =
	T extends HarnessModule<
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

export type InferAPI<T> = InferModule<T>['api'];

export type InferCompiler<T> = Compiler<InferAPI<T>, InferModule<T>['runtime']>;

export type InferState<T> = Simplify<InferModule<T>['state']>;

export type InferBoundAPI<T> = Simplify<
	BoundAPI<InferAPI<T>, InferModule<T>['runtime']>
>;

export type InferRuntime<T> = InferModule<T>['runtime'];

type RuntimeExtrasOf<Sys extends BaseHarnessModule> = RuntimeExtras<
	InferRuntime<Sys>
>;

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

export type CombinableModule<
	A extends BaseHarnessModule,
	B extends BaseHarnessModule,
> = AssertNoOverlap<InferState<A>, InferState<B>> &
	AssertNoOverlap<
		BoundAPI<InferAPI<A>, CombinedRuntimeOf<A, B>>,
		BoundAPI<InferAPI<B>, CombinedRuntimeOf<A, B>>
	> &
	AssertNoOverlap<RuntimeExtrasOf<A>, RuntimeExtrasOf<B>>;
