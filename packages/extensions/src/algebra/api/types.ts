import type { Apply, HKT } from '@franklin/lib';
import type { BaseRuntime } from '../runtime/index.js';

/**
 * Base constraint for an API surface — any object shape (registration
 * methods, collectors, etc.).
 */
export type BaseAPI = object;

/**
 * Type-level function `Runtime -> API`. A signature describes how to derive
 * the concrete author-facing API surface from the eventual runtime.
 *
 * Authoring a runtime-dependent signature:
 *
 *   interface CoreSignature extends Signature {
 *     In: CoreRuntime
 *     Out: {
 *       on(event: 'prompt', handler: WithContext<PromptHandler, this['In']>): void
 *       // ...
 *     }
 *   }
 *
 * For runtime-independent APIs, use `StaticSignature<A>`.
 */
export interface Signature extends HKT {
	readonly In: BaseRuntime;
	readonly Out: BaseAPI;
}

/**
 * The concrete API surface obtained by applying signature `S` at runtime `R`.
 * This is what extensions hold and call methods on.
 */
export type API<S extends Signature, R extends S['In']> = Apply<S, R>;

/**
 * Lift a runtime-independent API into the signature space.
 *
 *   export type StoreModule = StateExtensionModule<S, StaticSignature<StoreAPI>, R>
 */
export interface StaticSignature<A extends BaseAPI> extends Signature {
	readonly In: BaseRuntime;
	readonly Out: A;
}

/**
 * Combine two signatures: intersect inputs, intersect API surfaces at the
 * joined runtime.
 */
export interface CombineSignature<
	S1 extends Signature,
	S2 extends Signature,
> extends Signature {
	readonly In: S1['In'] & S2['In'];
	readonly Out: API<S1, this['In']> & API<S2, this['In']>;
}
