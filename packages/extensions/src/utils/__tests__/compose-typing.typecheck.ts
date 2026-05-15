import type {
	CanCompose,
	BinaryType,
	ReduceCompositionTuple,
	ValidateCompositionTuple,
} from '../compose-typing.js';

type Item<Fields extends object> = {
	readonly fields: Fields;
};

interface ComposeItems extends BinaryType {
	readonly In: readonly [Item<object>, Item<object>];
	readonly Out: Item<this['In'][0]['fields'] & this['In'][1]['fields']>;
}

interface RequireDisjointFields extends BinaryType {
	readonly In: readonly [Item<object>, Item<object>];
	readonly Out: Extract<
		keyof this['In'][0]['fields'],
		keyof this['In'][1]['fields']
	> extends never
		? unknown
		: never;
}

type _Expect<T extends true> = T;

type _CanComposeDisjointFields = _Expect<
	CanCompose<
		RequireDisjointFields,
		Item<{ readonly a: string }>,
		Item<{ readonly b: number }>
	>
>;

type _RejectsSharedFields = _Expect<
	CanCompose<
		RequireDisjointFields,
		Item<{ readonly a: string }>,
		Item<{ readonly a: number }>
	> extends false
		? true
		: false
>;

type _ReducedItems = ReduceCompositionTuple<
	readonly [
		Item<{ readonly a: string }>,
		Item<{ readonly b: number }>,
		Item<{ readonly c: boolean }>,
	],
	Item<object>,
	ComposeItems
>;

const _reducedItems = null as unknown as _ReducedItems;
const _a: string = _reducedItems.fields.a;
const _b: number = _reducedItems.fields.b;
const _c: boolean = _reducedItems.fields.c;
void [_a, _b, _c];

const _itemA = null as unknown as Item<{ readonly a: string }>;
const _itemB = null as unknown as Item<{ readonly b: number }>;
const _itemConflictingA = null as unknown as Item<{ readonly a: number }>;

const _invalidAccumulatedComposition: ValidateCompositionTuple<
	readonly [typeof _itemA, typeof _itemB, typeof _itemConflictingA],
	Item<object>,
	ComposeItems,
	RequireDisjointFields
> = [
	_itemA,
	_itemB,
	// @ts-expect-error third item conflicts with the accumulated first item
	_itemConflictingA,
];
void _invalidAccumulatedComposition;
