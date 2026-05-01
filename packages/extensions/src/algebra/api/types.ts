import type { Apply, HKT } from '@franklin/lib';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * Base constraint for an API surface — any object shape (registration
 * methods, collectors, etc.).
 */
export type BaseAPI = object;

/**
 * Type-level function `Runtime → API`. An API is just an HKT specialised
 * to take a runtime as input and produce an API surface.
 *
 * Authoring a runtime-dependent API:
 *
 *   interface CoreAPI extends API {
 *     In: CoreRuntime
 *     Out: {
 *       on(event: 'prompt', handler: WithContext<PromptHandler, this['In']>): void
 *       // ...
 *     }
 *   }
 *
 * For runtime-independent APIs, use `StaticAPI<A>`.
 */
export interface API extends HKT {
	readonly In: BaseRuntime;
	readonly Out: BaseAPI;
}

/**
 * The concrete, bound API surface obtained by applying `A` at runtime
 * `R`. This is what extensions hold and call methods on.
 */
export type BoundAPI<A extends API, R extends A['In']> = Apply<A, R>;

/**
 * Lift a runtime-independent API into the API space.
 *
 *   export type StoreSystem = RuntimeSystem<S, StaticAPI<StoreAPI>, R>
 */
export interface StaticAPI<A extends BaseAPI> extends API {
	readonly In: BaseRuntime;
	readonly Out: A;
}

/**
 * Compose two APIs: intersect inputs, intersect bound surfaces at the
 * joined runtime.
 */
export interface ComposeAPI<A1 extends API, A2 extends API> extends API {
	readonly In: A1['In'] & A2['In'];
	readonly Out: BoundAPI<A1, this['In']> & BoundAPI<A2, this['In']>;
}
