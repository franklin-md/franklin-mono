import type { DeepPartial } from '@franklin/lib';
import type { BaseState } from './types.js';

function isPlainObject(value: unknown): value is BaseState {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: BaseState, overrides: BaseState): BaseState {
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

export function resolveState<S extends BaseState>(
	base: S,
	overrides?: DeepPartial<S>,
): S {
	if (!overrides) return base;
	return deepMerge(base, overrides as BaseState) as S;
}
