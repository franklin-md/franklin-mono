/**
 * Lowercases every key in a headers record. Used to enforce the invariant
 * codified by `withNormalizedHeaders` that keys inside `WebFetchRequest` /
 * `WebFetchResponse` are canonical lowercase.
 */
export function lowercaseHeaders(
	headers: Record<string, string> | undefined,
): Record<string, string> {
	const result: Record<string, string> = {};
	if (!headers) {
		return result;
	}
	for (const [key, value] of Object.entries(headers)) {
		result[key.toLowerCase()] = value;
	}
	return result;
}

/**
 * Case-insensitive header lookup. Use when the input isn't guaranteed to have
 * gone through `withNormalizedHeaders` yet — e.g. inside a platform transport
 * reading the raw request before the decorator chain has applied.
 */
export function getHeader(
	headers: Record<string, string> | undefined,
	name: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}
	const target = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === target) {
			return value;
		}
	}
	return undefined;
}
