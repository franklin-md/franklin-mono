import { ipcRenderer } from 'electron';

import {
	isMethodDescriptor,
	isProxyDescriptor,
	isTransportDescriptor,
} from '../shared/descriptors/detect.js';
import type { ProxyDescriptor } from '../shared/descriptors/types.js';
import { deserializeProxy } from '../shared/descriptors/serde.js';
import { createChannels } from '../shared/channels.js';
import type { IpcStreamBridge, PreloadBridgeOf } from '../shared/api.js';

export function createIpcStreamBridge(channel: string): IpcStreamBridge {
	return {
		on: (callback: (packet: unknown) => void) => {
			const handler = (_event: Electron.IpcRendererEvent, packet: unknown) => {
				callback(packet);
			};
			ipcRenderer.on(channel, handler);
			return () => {
				ipcRenderer.removeListener(channel, handler);
			};
		},
		invoke: (packet: unknown) => {
			ipcRenderer.send(channel, packet);
		},
	};
}

function bindNode(
	name: string,
	path: string[],
	schema: ProxyDescriptor<unknown>,
): Record<string, unknown> {
	const channels = createChannels(name);
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(schema.shape)) {
		const nextPath = [...path, key];

		if (isProxyDescriptor(descriptor)) {
			node[key] = bindNode(name, nextPath, descriptor);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			const channel = channels.getMethodChannel(nextPath);
			node[key] = async (...args: unknown[]) => {
				const result = await ipcRenderer.invoke(channel, ...args);
				return descriptor.returns
					? deserializeProxy(result, descriptor.returns)
					: result;
			};
			continue;
		}

		if (isTransportDescriptor(descriptor)) {
			node[key] = {
				connect: (...args: unknown[]) =>
					ipcRenderer.invoke(
						channels.getTransportConnectChannel(nextPath),
						...args,
					) as Promise<string>,
				kill: (id: string) =>
					ipcRenderer.invoke(
						channels.getTransportKillChannel(nextPath),
						id,
					) as Promise<void>,
			};
		}
	}

	return node;
}

export function bindPreload<T>(
	name: string,
	schema: ProxyDescriptor<T>,
): PreloadBridgeOf<T> {
	return bindNode(
		name,
		[],
		schema as ProxyDescriptor<unknown>,
	) as PreloadBridgeOf<T>;
}
