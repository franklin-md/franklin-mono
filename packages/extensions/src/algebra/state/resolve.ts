import type { DeepPartial } from '@franklin/lib';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(
	base: Record<string, unknown>,
	overrides: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...base };
	for (const key of Object.keys(overrides)) {
		const overVal = overrides[key];
		if (overVal === undefined) continue;
		const baseVal = result[key];
		if (isPlainObject(baseVal) && isPlainObject(overVal)) {
			result[key] = deepMerge(baseVal, overVal);
		} else {
			result[key] = overVal;
		}
	}
	return result;
}

export function resolveState<S extends Record<string, unknown>>(
	base: S,
	overrides?: DeepPartial<S>,
): S {
	if (!overrides) return base;
	return deepMerge(base, overrides as Record<string, unknown>) as S;
}
