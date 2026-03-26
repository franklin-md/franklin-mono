import {
	isDuplexDescriptor,
	isLeaseDescriptor,
	isMethodDescriptor,
	isProxyDescriptor,
} from '../../../shared/descriptors/detect.js';
import type {
	Descriptor,
	ProxyDescriptor,
} from '../../../shared/descriptors/types.js';
import { registerHandleHandler } from './handle.js';
import { registerMethodHandler } from './method.js';
import { registerTransportHandler } from './transport.js';
import type { BindingContext } from './types.js';

export function registerProxyHandlers(
	name: string,
	context: BindingContext,
	path: string[],
	schema: ProxyDescriptor<unknown, any>,
): Array<() => void> {
	const unregister: Array<() => void> = [];

	for (const [key, descriptor] of Object.entries(schema.shape) as Array<
		[string, Descriptor]
	>) {
		const nextPath = [...path, key];

		if (isProxyDescriptor(descriptor)) {
			unregister.push(
				...registerProxyHandlers(name, context, nextPath, descriptor),
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			unregister.push(registerMethodHandler(name, context, nextPath));
			continue;
		}

		if (isLeaseDescriptor(descriptor)) {
			unregister.push(
				...(isDuplexDescriptor(descriptor.inner)
					? registerTransportHandler(name, context, nextPath)
					: registerHandleHandler(name, context, nextPath, descriptor.inner)),
			);
		}
	}

	return unregister;
}
