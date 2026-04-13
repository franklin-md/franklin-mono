import type { AnyShape } from '../../descriptors/types/index.js';
import type { NamespaceDescriptor } from '../../descriptors/types/index.js';
import type { ServerRuntime } from '../../runtime.js';
import type { ResourceContext } from '../context.js';
import { bindNode } from './index.js';

export function bindNamespace(
	descriptor: NamespaceDescriptor<any, any>,
	value: unknown,
	runtime: ServerRuntime,
	contexts: ResourceContext[],
): Array<() => void> {
	const shape = descriptor.shape as AnyShape;
	const unregister: Array<() => void> = [];
	for (const key of Object.keys(shape)) {
		const child = shape[key];
		if (!child) continue;
		const childRuntime = runtime.registerNamespace(key);
		const childValue = (value as Record<string, unknown>)[key];
		unregister.push(
			...bindNode(child, childValue, value, childRuntime, contexts),
		);
	}
	return unregister;
}
