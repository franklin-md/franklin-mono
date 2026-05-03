declare const __storeType: unique symbol;

/**
 * A branded string that carries the store's value type at the type level.
 *
 * At runtime this is just the string `X` (the store name). The phantom
 * `T` type is attached via a unique symbol brand, giving consumers
 * full type inference without any runtime overhead.
 */
export type StoreKey<X extends string, T> = X & {
	readonly [__storeType]: T;
};

/**
 * Create a typed store key. Zero runtime overhead — returns the
 * name string unchanged, branded at the type level only.
 */
export function storeKey<X extends string, T>(name: X): StoreKey<X, T> {
	return name as StoreKey<X, T>;
}

/**
 * Extract the value type from a StoreKey.
 */
export type StoreValueType<K> =
	K extends StoreKey<string, infer T> ? T : unknown;
