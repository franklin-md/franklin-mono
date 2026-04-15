import type { DescriptorKind } from '../descriptors/index.js';
import { UnsupportedDescriptorError } from './error.js';

export function requireCapability<T, K extends keyof T>(
	runtime: T,
	key: K,
	kind: DescriptorKind,
): NonNullable<T[K]> {
	const fn = runtime[key];
	if (!fn) throw new UnsupportedDescriptorError(kind);
	return (fn as (...args: never[]) => unknown).bind(runtime) as NonNullable<
		T[K]
	>;
}
