import type { InferNamespaceValue } from '../types/infer.js';
import type { Descriptor } from '../types/descriptor.js';
import type {
	NamespaceDescriptor,
	NamespaceShape,
} from '../types/namespace.js';
import { NAMESPACE_KIND } from '../types/namespace.js';

export type { NamespaceShape } from '../types/namespace.js';

export function namespace<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): NamespaceDescriptor<InferNamespaceValue<TShape>, TShape>;
export function namespace<T>(
	shape: NamespaceShape<T>,
): NamespaceDescriptor<T, NamespaceShape<T>>;
export function namespace(
	shape: Record<string, Descriptor>,
): NamespaceDescriptor<any, any> {
	return { kind: NAMESPACE_KIND, shape };
}
