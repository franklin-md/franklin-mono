import {
	isMethodDescriptor,
	isProxyDescriptor,
	isTransportDescriptor,
} from '../../../shared/descriptors/detect.js';
import type { ProxyDescriptor } from '../../../shared/descriptors/types.js';
import { registerMethodHandler } from './method.js';
import { registerTransportHandler } from './transport.js';
import type { BoundWindow } from './types.js';

export function registerProxyHandlers(
	name: string,
	binding: BoundWindow,
	path: string[],
	schema: ProxyDescriptor<unknown>,
): Array<() => void> {
	const unregister: Array<() => void> = [];

	for (const [key, descriptor] of Object.entries(schema.shape)) {
		const nextPath = [...path, key];

		if (isProxyDescriptor(descriptor)) {
			unregister.push(
				...registerProxyHandlers(name, binding, nextPath, descriptor),
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			unregister.push(
				registerMethodHandler(name, binding, nextPath, descriptor),
			);
			continue;
		}

		if (isTransportDescriptor(descriptor)) {
			unregister.push(...registerTransportHandler(name, binding, nextPath));
		}
	}

	return unregister;
}
