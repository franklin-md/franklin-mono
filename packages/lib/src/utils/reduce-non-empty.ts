export function reduceNonEmpty<T>(
	values: readonly T[],
	combine: (left: T, right: T) => T,
	message: string,
): T {
	if (values.length === 0) {
		throw new Error(message);
	}
	let acc = values[0] as T;
	for (const next of values.slice(1)) {
		acc = combine(acc, next);
	}
	return acc;
}
