import type { Apply, HKT } from './unary.js';

/**
 * Binary type-level function used by tuple folds, encoded as a unary HKT over
 * a `[value, accumulator]` pair.
 *
 * Concrete folds refine `In` and define `Out` in terms of `this['In'][0]`
 * and `this['In'][1]`.
 */
export interface Fold extends HKT {
	readonly In: readonly [unknown, unknown];
}

export type ApplyFold<F extends Fold, Value, Accumulator> = Apply<
	F,
	readonly [Value, Accumulator] & F['In']
>;

export type FoldRight<
	Values extends readonly unknown[],
	Initial,
	F extends Fold,
> = Values extends readonly []
	? Initial
	: Values extends readonly [
				infer Head,
				...infer Tail extends readonly unknown[],
		  ]
		? ApplyFold<F, Head, FoldRight<Tail, Initial, F>>
		: Initial;
