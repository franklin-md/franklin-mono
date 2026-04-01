import type {
	ResourceDescriptor,
	ResourceInnerDescriptor,
} from '../types/resource.js';
import { RESOURCE_KIND } from '../types/resource.js';

export function resource<
	TArgs extends unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
>(inner: TInner): ResourceDescriptor<TArgs, TInner> {
	return { kind: RESOURCE_KIND, inner };
}
