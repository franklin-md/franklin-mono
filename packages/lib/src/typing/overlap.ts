export type OverlappingKeys<A, B> = Extract<keyof A, keyof B>;

// Intersecting with `unknown` is a no-op (`X & unknown` => `X`), while
// intersecting with `never` collapses the result (`X & never` => `never`).
// That makes this useful as a guard that preserves valid compositions and
// rejects overlapping ones when threaded into another type.
export type AssertNoOverlap<A, B> =
	OverlappingKeys<A, B> extends never ? unknown : never;
