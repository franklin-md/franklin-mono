import type { JsonValue } from '@franklin/lib';

export function decodeTransit(value: JsonValue): JsonValue {
	if (Array.isArray(value)) return value.map(decodeTransit);
	if (value && typeof value === 'object') {
		const entries = Object.entries(value);
		const tag = entries.length === 1 ? entries[0] : undefined;
		if (tag?.[0].startsWith('~#')) {
			if (!['~#set', '~#list', '~#dt'].includes(tag[0]))
				throw new Error(`Unsupported Mochi Transit tag: ${tag[0]}`);
			return decodeTransit(tag[1]);
		}
		return Object.fromEntries(
			entries.map(([key, entry]) => [
				key.startsWith('~:') ? key.slice(2) : key,
				decodeTransit(entry),
			]),
		);
	}
	if (typeof value === 'string') {
		if (value.startsWith('~:')) return value.slice(2);
		if (value.startsWith('~~')) return value.slice(1);
		if (/^~[tm]\d+$/.test(value)) return Number(value.slice(2));
		if (value.startsWith('~'))
			throw new Error('Unsupported Mochi Transit encoding');
	}
	return value;
}
