/**
 * Single-parameter type-level function (higher-kinded type).
 *
 * TypeScript has no first-class type constructors as type parameters, so
 * HKTs are encoded by defunctionalisation: declare an interface with a
 * phantom `In` slot, fill it via intersection, read the `Out` slot. The
 * encoding mirrors Effect's `TypeLambda`, simplified to one input.
 *
 * Subtypes refine the `In` constraint and shape the `Out` body, often
 * referencing `this['In']` to depend on the eventual input.
 *
 *   interface List extends HKT {
 *     In: unknown
 *     Out: this['In'][]
 *   }
 *   type Numbers = Apply<List, number>   // number[]
 */
export interface HKT {
	readonly In: unknown;
	readonly Out: unknown;
}

/**
 * Apply HKT `F` at input `X`: substitute the phantom slot and read `Out`.
 */
export type Apply<F extends HKT, X extends F['In']> = (F & {
	readonly In: X;
})['Out'];
