import { ipcRenderer } from 'electron';

import {
	isHandleDescriptor,
	isMethodDescriptor,
	isProxyDescriptor,
	isTransportDescriptor,
} from '../shared/descriptors/detect.js';
import type {
	Descriptor,
	HandleMemberDescriptor,
	ProxyDescriptor,
} from '../shared/descriptors/types.js';
import { deserializeProxy } from '../shared/descriptors/serde.js';
import { createChannels } from '../shared/channels.js';
import type { IpcStreamBridge, PreloadBridgeOf } from '../shared/api.js';

type BindContext =
	| { kind: 'root'; name: string; path: string[] }
	| {
			kind: 'lease';
			name: string;
			handlePath: string[];
			memberPath: string[];
	  };

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

function bindMembers(
	shape: Record<string, Descriptor | HandleMemberDescriptor>,
	context: BindContext,
): Record<string, unknown> {
	const channels = createChannels(context.name);
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(shape) as Array<
		[string, Descriptor | HandleMemberDescriptor]
	>) {
		if (isProxyDescriptor(descriptor)) {
			node[key] = bindMembers(
				descriptor.shape as Record<string, Descriptor | HandleMemberDescriptor>,
				context.kind === 'root'
					? { kind: 'root', name: context.name, path: [...context.path, key] }
					: {
							kind: 'lease',
							name: context.name,
							handlePath: context.handlePath,
							memberPath: [...context.memberPath, key],
						},
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			const channel =
				context.kind === 'root'
					? channels.getMethodChannel([...context.path, key])
					: channels.getHandleMethodChannel(context.handlePath, [
							...context.memberPath,
							key,
						]);
			node[key] =
				context.kind === 'root'
					? async (...invokeArgs: unknown[]) => {
							const result = await ipcRenderer.invoke(channel, ...invokeArgs);
							return descriptor.returns
								? deserializeProxy(result, descriptor.returns)
								: result;
						}
					: async (id: string, ...invokeArgs: unknown[]) => {
							const result = await ipcRenderer.invoke(
								channel,
								id,
								...invokeArgs,
							);
							return descriptor.returns
								? deserializeProxy(result, descriptor.returns)
								: result;
						};
			continue;
		}

		if (context.kind !== 'root') {
			throw new Error(`Unsupported descriptor inside handle at ${key}`);
		}

		const nextPath = [...context.path, key];
		if (isTransportDescriptor(descriptor)) {
			node[key] = {
				connect: (...args: unknown[]) =>
					ipcRenderer.invoke(
						channels.getLeaseConnectChannel(nextPath),
						...args,
					) as Promise<string>,
				kill: (id: string) =>
					ipcRenderer.invoke(
						channels.getLeaseKillChannel(nextPath),
						id,
					) as Promise<void>,
			};
			continue;
		}

		if (isHandleDescriptor(descriptor)) {
			node[key] = {
				connect: (...args: unknown[]) =>
					ipcRenderer.invoke(
						channels.getLeaseConnectChannel(nextPath),
						...args,
					) as Promise<string>,
				kill: (id: string) =>
					ipcRenderer.invoke(
						channels.getLeaseKillChannel(nextPath),
						id,
					) as Promise<void>,
				proxy: bindMembers(descriptor.shape, {
					kind: 'lease',
					name: context.name,
					handlePath: nextPath,
					memberPath: [],
				}),
			};
		}
	}

	return node;
}

export function bindPreload<TSchema extends ProxyDescriptor<any, any>>(
	name: string,
	schema: TSchema,
): PreloadBridgeOf<TSchema> {
	return bindMembers(schema.shape, {
		kind: 'root',
		name,
		path: [],
	}) as PreloadBridgeOf<TSchema>;
}
