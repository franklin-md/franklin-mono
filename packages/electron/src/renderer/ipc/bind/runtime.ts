import {
	bindClient,
	getValueAtPath,
	isNamespaceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';
import type { ResourceDescriptor, ProxyRuntime } from '@franklin/lib/proxy';
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
		bindMethod(path: string[]): (...args: unknown[]) => Promise<unknown> {
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
				const streamChannel = channels.getDuplexStreamChannel(path);
				return async (...args: unknown[]) => {
					const id = await rawLease.connect(...args);
					const inner = createIpcStream(`${streamChannel}:${id}`);
					const dispose = async () => {
						await inner.close();
						await rawLease.kill(id);
					};
					return {
						readable: inner.readable,
						writable: inner.writable,
						close: dispose,
						dispose,
					};
				};
			}

			if (isNamespaceDescriptor(descriptor.inner)) {
				const handleBridge = rawLease as PreloadHandleBridge<any, any>;
				return async (...args: unknown[]) => {
					const id = await handleBridge.connect(...args);
					const leaseRuntime = createLeaseRuntime(
						handleBridge.proxy as Record<string, unknown>,
						id,
					);
					const bound = bindClient(
						descriptor.inner,
						leaseRuntime,
					) as Record<string, unknown>;
					return Object.assign(bound, {
						dispose: async () => {
							await handleBridge.kill(id);
						},
					});
				};
			}

			throw new Error(
				`Unsupported resource inner descriptor at ${path.join('.')}`,
			);
		},
	};
}

/**
 * A ProxyRuntime for binding methods inside a leased handle.
 * Methods are curried with the lease ID so the preload bridge
 * can route them to the correct lease instance.
 */
function createLeaseRuntime(
	bridgeProxy: Record<string, unknown>,
	leaseId: string,
): ProxyRuntime {
	return {
		bindMethod(path: string[]): (...args: unknown[]) => Promise<unknown> {
			const rawMethod = getValueAtPath(bridgeProxy, path) as (
				id: string,
				...args: unknown[]
			) => Promise<unknown>;
			return (...args: unknown[]) => rawMethod(leaseId, ...args);
		},
	};
}
