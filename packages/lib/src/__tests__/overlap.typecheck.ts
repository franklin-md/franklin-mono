import type { AssertNoOverlap, OverlappingKeys } from '../index.js';

type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _Expect<T extends true> = T;

type _DisjointKeys = _Expect<
	_Equal<OverlappingKeys<{ env: string }, { store: number }>, never>
>;

type _SharedKeys = _Expect<
	_Equal<
		OverlappingKeys<
			{ core: string; env: boolean },
			{ env: number; store: number }
		>,
		'env'
	>
>;

type _AllowsDisjointRecords = _Expect<
	_Equal<AssertNoOverlap<{ env: string }, { store: number }>, unknown>
>;

type _RejectsOverlappingRecords = _Expect<
	_Equal<AssertNoOverlap<{ env: string }, { env: number }>, never>
>;
