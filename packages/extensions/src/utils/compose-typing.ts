import type { Apply, HKT } from '@franklin/lib';

export interface BinaryType extends HKT {
	readonly In: readonly [unknown, unknown];
}

export type ApplyBinaryType<F extends BinaryType, Left, Right> = Apply<
	F,
	readonly [Left, Right] & F['In']
>;

export type CanCompose<Guard extends BinaryType, Left, Right> = [
	ApplyBinaryType<Guard, Left, Right>,
] extends [never]
	? false
	: true;

export type ReduceCompositionTuple<
	Values extends readonly Element[],
	Element,
	Compose extends BinaryType,
	Acc = null,
> = Values extends readonly [
	infer Head extends Element,
	...infer Tail extends readonly Element[],
]
	? ReduceCompositionTuple<
			Tail,
			Element,
			Compose,
			[Acc] extends [null] ? Head : ApplyBinaryType<Compose, Acc, Head>
		>
	: [Acc] extends [null]
		? never
		: Acc;

export type ValidateCompositionTuple<
	Values extends readonly Element[],
	Element,
	Compose extends BinaryType,
	Guard extends BinaryType,
	Acc = null,
> = Values extends readonly [
	infer Head extends Element,
	...infer Tail extends readonly Element[],
]
	? readonly [
			[Acc] extends [null] ? Head : Head & ApplyBinaryType<Guard, Acc, Head>,
			...ValidateCompositionTuple<
				Tail,
				Element,
				Compose,
				Guard,
				[Acc] extends [null] ? Head : ApplyBinaryType<Compose, Acc, Head>
			>,
		]
	: Values;
