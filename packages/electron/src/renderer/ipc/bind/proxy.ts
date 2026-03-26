import {
	isDuplexDescriptor,
	isLeaseDescriptor,
	isMethodDescriptor,
	isProxyDescriptor,
} from '../../../shared/descriptors/detect.js';
import type {
	Descriptor,
	HandleMemberDescriptor,
	ProxyDescriptor,
} from '../../../shared/descriptors/types.js';
import type {
	PreloadHandleBridge,
	PreloadLeaseBridge,
} from '../../../shared/api.js';
import { attachLease } from './lease.js';
import { bindTransport } from './transport.js';

type BindContext =
	| { kind: 'root'; name: string; path: string[] }
	| { kind: 'lease'; id: string };

export function bindProxy(
	name: string,
	path: string[],
	schema: ProxyDescriptor<unknown, any>,
	ipcBridge: Record<string, unknown>,
): Record<string, unknown> {
	return bindMembers(schema.shape, ipcBridge, { kind: 'root', name, path });
}

function bindMembers(
	shape: Record<string, Descriptor | HandleMemberDescriptor>,
	rawNode: Record<string, unknown>,
	context: BindContext,
): Record<string, unknown> {
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(shape) as Array<
		[string, Descriptor | HandleMemberDescriptor]
	>) {
		const rawValue = rawNode[key];
		if (isProxyDescriptor(descriptor)) {
			node[key] = bindMembers(
				descriptor.shape as Record<string, Descriptor | HandleMemberDescriptor>,
				rawValue as Record<string, unknown>,
				context.kind === 'root'
					? { kind: 'root', name: context.name, path: [...context.path, key] }
					: context,
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			node[key] =
				context.kind === 'lease'
					? (...args: unknown[]) =>
							(
								rawValue as (id: string, ...args: unknown[]) => Promise<unknown>
							)(context.id, ...args)
					: rawValue;
			continue;
		}

		if (context.kind !== 'root') {
			throw new Error(`Unsupported descriptor inside leased proxy at ${key}`);
		}

		const nextPath = [...context.path, key];
		if (isLeaseDescriptor(descriptor)) {
			node[key] = isDuplexDescriptor(descriptor.inner)
				? bindTransport(
						context.name,
						nextPath,
						rawValue as PreloadLeaseBridge<any, any>,
					)
				: async (...args: unknown[]) => {
						const rawLease = rawValue as PreloadHandleBridge<any, any>;
						const id = await rawLease.connect(...args);
						const bound = bindMembers(
							descriptor.inner.shape,
							rawLease.proxy as Record<string, unknown>,
							{ kind: 'lease', id },
						);
						return attachLease(bound, async () => {
							await rawLease.kill(id);
						});
					};
		}
	}

	return node;
}
