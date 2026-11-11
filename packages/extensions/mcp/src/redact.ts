import type { JsonValue } from '@franklin/lib';

export function redactValue<T extends JsonValue>(
	value: T,
	secrets: Iterable<string>,
): T {
	const values = [...secrets]
		.filter(Boolean)
		.sort((a, b) => b.length - a.length);
	const redact = (text: string) =>
		values.reduce(
			(result, secret) => result.replaceAll(secret, '[REDACTED]'),
			text,
		);
	function visit(value: JsonValue): JsonValue {
		if (typeof value === 'string') return redact(value);
		if (Array.isArray(value)) return value.map(visit);
		if (value !== null && typeof value === 'object')
			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => [
					redact(key),
					visit(child),
				]),
			);
		return value;
	}
	return visit(value) as T;
}
