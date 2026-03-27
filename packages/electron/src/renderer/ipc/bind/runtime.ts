import {
	bindClient,
	getValueAtPath,
	isNamespaceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';
import type { ResourceDescriptor, ProxyRuntime } from '@franklin/lib/proxy';
import type {
	PreloadHandleBridge,
	PreloadResourceBridge,
	PreloadStreamBridge,
	PreloadTransportBridge,
} from '../../../shared/api.js';
import { createIpcStream } from '../stream.js';

export function createClientRuntime(
	bridge: Record<string, unknown>,
): ProxyRuntime {
	return {
		bindMethod(path: string[]): (...args: unknown[]) => Promise<unknown> {
			return getValueAtPath(bridge, path) as (
				...args: unknown[]
			) => Promise<unknown>;
		},

		bindStream(path: string[]): unknown {
			return createIpcStream(
				getValueAtPath(bridge, path) as PreloadStreamBridge<any, any>,
			);
		},

		bindResource(
			path: string[],
			descriptor: ResourceDescriptor<any, any>,
		): (...args: unknown[]) => Promise<unknown> {
			const rawResource = getValueAtPath(bridge, path) as PreloadResourceBridge<
				any,
				any
			>;

			if (isStreamDescriptor(descriptor.inner)) {
				const transportBridge = rawResource as PreloadTransportBridge<any>;
				return async (...args: unknown[]) => {
					const id = await transportBridge.connect(...args);
					const inner = createIpcStream(
						transportBridge.stream(id),
						async () => {
							await transportBridge.kill(id);
						},
					);
					const dispose = async () => {
						await inner.close();
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
				const handleBridge = rawResource as PreloadHandleBridge<any, any>;
				return async (...args: unknown[]) => {
					const id = await handleBridge.connect(...args);
					const leaseRuntime = createLeaseRuntime(
						handleBridge.proxy as Record<string, unknown>,
						id,
					);
					const bound = bindClient(descriptor.inner, leaseRuntime) as Record<
						string,
						unknown
					>;
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
