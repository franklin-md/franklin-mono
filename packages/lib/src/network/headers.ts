/**
 * Case-insensitive header lookup over a plain headers record.
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

/**
 * Case-insensitive header upsert over a plain headers record. Existing entries
 * for the same header name are removed before the new key/value is written.
 */
export function setHeader(
	headers: Record<string, string> | undefined,
	name: string,
	value: string,
): Record<string, string> {
	const result: Record<string, string> = {};
	const target = name.toLowerCase();

	for (const [key, existingValue] of Object.entries(headers ?? {})) {
		if (key.toLowerCase() === target) {
			continue;
		}
		result[key] = existingValue;
	}

	result[name] = value;
	return result;
}
