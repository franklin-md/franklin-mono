import {
	isMethodDescriptor,
	isNamespaceDescriptor,
	isStreamDescriptor,
	getValueAtPath,
} from '@franklin/lib/proxy';
import type {
	AnyShape,
	MethodDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ProxyRuntime,
} from '@franklin/lib/proxy';
import type { Duplex } from '@franklin/transport';

import type {
	PreloadHandleBridge,
	PreloadLeaseBridge,
} from '../../../shared/api.js';
import { createIpcStream } from '../stream.js';
import type { ChannelNamespace } from '../../../shared/channels.js';

export function createClientRuntime(
	channels: ChannelNamespace,
	bridge: Record<string, unknown>,
): ProxyRuntime {
	return {
		bindMethod(
			path: string[],
			_descriptor: MethodDescriptor<any, any>,
		): (...args: unknown[]) => Promise<unknown> {
			return getValueAtPath(bridge, path) as (
				...args: unknown[]
			) => Promise<unknown>;
		},

		bindResource(
			path: string[],
			descriptor: ResourceDescriptor<any, any>,
		): (...args: unknown[]) => Promise<unknown> {
			const rawLease = getValueAtPath(bridge, path) as PreloadLeaseBridge<
				any,
				any
			>;

			if (isStreamDescriptor(descriptor.inner)) {
				return bindTransport(channels, path, rawLease);
			}
			if (isNamespaceDescriptor(descriptor.inner)) {
				return bindHandle(
					rawLease as PreloadHandleBridge<any, any>,
					descriptor.inner,
				);
			}
			throw new Error(
				`Unsupported resource inner descriptor at ${path.join('.')}`,
			);
		},
	};
}

function bindTransport(
	channels: ChannelNamespace,
	path: string[],
	rawLease: PreloadLeaseBridge<any, any>,
): (
	...args: unknown[]
) => Promise<Duplex<unknown, unknown> & { dispose(): Promise<void> }> {
	const streamChannel = channels.getDuplexStreamChannel(path);

	return async (...args: unknown[]) => {
		const id = await rawLease.connect(...args);
		const inner = createIpcStream(`${streamChannel}:${id}`);

		return {
			readable: inner.readable,
			writable: inner.writable,
			close: async () => {
				await inner.close();
				await rawLease.kill(id);
			},
			dispose: async () => {
				await inner.close();
				await rawLease.kill(id);
			},
		};
	};
}

function bindHandle(
	rawLease: PreloadHandleBridge<any, any>,
	inner: NamespaceDescriptor<any, any>,
): (
	...args: unknown[]
) => Promise<Record<string, unknown> & { dispose(): Promise<void> }> {
	return async (...args: unknown[]) => {
		const id = await rawLease.connect(...args);
		const bound = bindLeaseMembers(
			inner.shape as AnyShape,
			rawLease.proxy as Record<string, unknown>,
			id,
		);
		bound.dispose = async () => {
			await rawLease.kill(id);
		};
		return bound as Record<string, unknown> & { dispose(): Promise<void> };
	};
}

function bindLeaseMembers(
	shape: AnyShape,
	rawNode: Record<string, unknown>,
	leaseId: string,
): Record<string, unknown> {
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(shape)) {
		const rawValue = rawNode[key];

		if (isNamespaceDescriptor(descriptor)) {
			node[key] = bindLeaseMembers(
				descriptor.shape as AnyShape,
				rawValue as Record<string, unknown>,
				leaseId,
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			node[key] = (...args: unknown[]) =>
				(rawValue as (id: string, ...args: unknown[]) => Promise<unknown>)(
					leaseId,
					...args,
				);
			continue;
		}

		throw new Error(`Unsupported descriptor inside leased proxy at ${key}`);
	}

	return node;
}
