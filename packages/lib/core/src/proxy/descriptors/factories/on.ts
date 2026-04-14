import type { OnDescriptor } from '../types/on.js';
import { ON_KIND } from '../types/on.js';

export function on<TData>(): OnDescriptor<TData> {
	return { kind: ON_KIND };
}
