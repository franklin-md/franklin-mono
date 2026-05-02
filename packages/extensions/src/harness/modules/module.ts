import type { API } from '../../algebra/api/index.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { BaseRuntime, StateHandle } from '../../algebra/runtime/index.js';
import type { BaseState } from '../state/index.js';

declare const MODULE_API: unique symbol;

/**
 * A `HarnessModule` owns three things:
 *  - `emptyState()` — the initial state shape for the module
 *  - `createCompiler(state)` — configure the module against the supplied
 *    state and hand back a compiler that registers extensions and builds the
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
	// TODO: Is this actually needed?
	readonly [MODULE_API]?: A;
	emptyState(): S;
	createCompiler(state: S): Compiler<A, Runtime>;
	state(runtime: Runtime): StateHandle<S>;
};

export type BaseHarnessModule = HarnessModule<any, any, any>;
