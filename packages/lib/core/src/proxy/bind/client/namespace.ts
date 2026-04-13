import type { AnyShape, Descriptor } from '../../descriptors/types/index.js';
import type { NamespaceDescriptor } from '../../descriptors/types/index.js';
import type { ProxyRuntime } from '../../runtime.js';

type BuildFn = (descriptor: Descriptor, runtime: ProxyRuntime) => unknown;

export function buildNamespace(
	descriptor: NamespaceDescriptor<any, any>,
	runtime: ProxyRuntime,
	build: BuildFn,
): Record<string, unknown> {
	const shape = descriptor.shape as AnyShape;
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(shape)) {
		const child = shape[key];
		if (!child) continue;
		result[key] = build(child, runtime.bindNamespace(key));
	}
	return result;
}
