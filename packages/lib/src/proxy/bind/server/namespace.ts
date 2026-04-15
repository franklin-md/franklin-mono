import type { AnyShape } from '../../descriptors/types/index.js';
import type { NamespaceDescriptor } from '../../descriptors/types/index.js';
import type { ServerRuntime } from '../../runtime.js';
import { bindNode } from './index.js';

export function bindNamespace(
	descriptor: NamespaceDescriptor<any, any>,
	value: unknown,
	runtime: ServerRuntime,
): Array<() => void | Promise<void>> {
	const shape = descriptor.shape as AnyShape;
	const unregister: Array<() => void | Promise<void>> = [];
	for (const key of Object.keys(shape)) {
		const child = shape[key];
		if (!child) continue;
		const childRuntime = runtime.registerNamespace(key);
		const childValue = (value as Record<string, unknown>)[key];
		unregister.push(...bindNode(child, childValue, value, childRuntime));
	}
	return unregister;
}
