import {
	isMethodDescriptor,
	isProxyDescriptor,
	isTransportDescriptor,
} from '../../../shared/descriptors/detect.js';
import type { ProxyDescriptor } from '../../../shared/descriptors/types.js';
import { bindTransport, type IpcTransportBridge } from './transport.js';

export function bindProxy(
	name: string,
	path: string[],
	schema: ProxyDescriptor<unknown>,
	ipcBridge: Record<string, unknown>,
): Record<string, unknown> {
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(schema.shape)) {
		const nextPath = [...path, key];
		const rawValue = ipcBridge[key];

		// Recurse
		if (isProxyDescriptor(descriptor)) {
			node[key] = bindProxy(
				name,
				nextPath,
				descriptor,
				rawValue as Record<string, unknown>,
			);
			continue;
		}

		// The bridge we get for the pre-render (something that proxies an f:A->B via ipc.invoke) is
		// already what we need (i.e. a function of A->B)

		if (isMethodDescriptor(descriptor)) {
			node[key] = rawValue;
			continue;
		}

		// This is the one thing that cannot go perfectly across
		if (isTransportDescriptor(descriptor)) {
			node[key] = bindTransport(name, nextPath, rawValue as IpcTransportBridge);
		}
	}

	return node;
}
