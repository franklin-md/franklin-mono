import type { Apply, Fold, FoldRight, HKT } from '../index.js';

type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _Expect<T extends true> = T;

interface ArrayHKT extends HKT {
	readonly In: unknown;
	readonly Out: this['In'][];
}

type _AppliesUnaryHKT = _Expect<_Equal<Apply<ArrayHKT, string>, string[]>>;

interface PairFold extends Fold {
	readonly In: readonly [unknown, unknown];
	readonly Out: readonly [this['In'][0], this['In'][1]];
}

type _FoldsRight = _Expect<
	_Equal<
		FoldRight<readonly ['a', 'b'], 'done', PairFold>,
		readonly ['a', readonly ['b', 'done']]
	>
>;
