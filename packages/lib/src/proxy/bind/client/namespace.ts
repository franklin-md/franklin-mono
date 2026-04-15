import type { AnyShape } from '../../descriptors/types/index.js';
import type { NamespaceDescriptor } from '../../descriptors/types/index.js';
import type { ProxyRuntime } from '../../runtime.js';
import { buildDescriptor } from './index.js';

export function buildNamespace(
	descriptor: NamespaceDescriptor<any, any>,
	runtime: ProxyRuntime,
): Record<string, unknown> {
	const shape = descriptor.shape as AnyShape;
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(shape)) {
		const child = shape[key];
		if (!child) continue;
		result[key] = buildDescriptor(child, runtime.bindNamespace(key));
	}
	return result;
}
