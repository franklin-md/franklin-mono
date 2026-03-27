import { ipcRenderer } from 'electron';
import {
	isMethodDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';
import type {
	AnyShape,
	Descriptor,
	NamespaceDescriptor,
} from '@franklin/lib/proxy';

import type { ChannelNamespace } from '../shared/channels.js';
import { createChannels } from '../shared/channels.js';
import {
	isIpcStreamMessage,
	type PreloadBridgeOf,
	type PreloadStreamBridge,
	type PreloadTransportBridge,
} from '../shared/api.js';

type BindContext =
	| { kind: 'root'; channels: ChannelNamespace; path: string[] }
	| {
			kind: 'lease';
			channels: ChannelNamespace;
			leasePath: string[];
			memberPath: string[];
	  };

function createIpcStreamBridge(channel: string): PreloadStreamBridge {
	return {
		subscribe: (observer) => {
			let active = true;
			const handler = (_event: Electron.IpcRendererEvent, packet: unknown) => {
				if (!active || !isIpcStreamMessage(packet)) {
					return;
				}

				if (packet.kind === 'data') {
					observer.next(packet.data);
					return;
				}

				active = false;
				ipcRenderer.removeListener(channel, handler);
				observer.close();
			};

			ipcRenderer.on(channel, handler);
			return () => {
				if (!active) return;
				active = false;
				ipcRenderer.removeListener(channel, handler);
			};
		},
		send: (packet) => {
			ipcRenderer.send(channel, { kind: 'data', data: packet });
		},
		close: async () => {
			ipcRenderer.send(channel, { kind: 'close' });
		},
	};
}

function bindDescriptor(
	key: string,
	descriptor: Descriptor,
	context: BindContext,
): unknown {
	const { channels } = context;

	if (isNamespaceDescriptor(descriptor)) {
		return bindMembers(
			descriptor.shape,
			context.kind === 'root'
				? { kind: 'root', channels, path: [...context.path, key] }
				: {
						kind: 'lease',
						channels,
						leasePath: context.leasePath,
						memberPath: [...context.memberPath, key],
					},
		);
	}

	if (isMethodDescriptor(descriptor)) {
		const channel =
			context.kind === 'root'
				? channels.getMethodChannel([...context.path, key])
				: channels.getLeaseMethodChannel(context.leasePath, [
						...context.memberPath,
						key,
					]);
		return context.kind === 'root'
			? (...invokeArgs: unknown[]) => ipcRenderer.invoke(channel, ...invokeArgs)
			: (id: string, ...invokeArgs: unknown[]) =>
					ipcRenderer.invoke(channel, id, ...invokeArgs);
	}

	if (isStreamDescriptor(descriptor)) {
		if (context.kind !== 'root') {
			throw new Error(`Unsupported descriptor inside leased proxy at ${key}`);
		}

		return createIpcStreamBridge(
			channels.getStreamChannel([...context.path, key]),
		);
	}

	if (!isResourceDescriptor(descriptor)) {
		throw new Error(`Unknown descriptor at ${key}`);
	}

	if (context.kind !== 'root') {
		throw new Error(`Unsupported descriptor inside leased proxy at ${key}`);
	}

	const nextPath = [...context.path, key];
	const resourceBridge: Record<string, unknown> = {
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

	if (isNamespaceDescriptor(descriptor.inner)) {
		resourceBridge.proxy = bindMembers(descriptor.inner.shape, {
			kind: 'lease',
			channels,
			leasePath: nextPath,
			memberPath: [],
		});
		return resourceBridge;
	}

	if (isStreamDescriptor(descriptor.inner)) {
		(resourceBridge as unknown as PreloadTransportBridge).stream = (
			id: string,
		) => createIpcStreamBridge(channels.getLeaseStreamChannel(nextPath, id));
		return resourceBridge;
	}

	throw new Error(`Unsupported leased value at ${nextPath.join('.')}`);
}

function bindMembers(
	shape: AnyShape,
	context: BindContext,
): Record<string, unknown> {
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(shape)) {
		node[key] = bindDescriptor(key, descriptor, context);
	}

	return node;
}

export function bindPreload<TSchema extends NamespaceDescriptor<any, any>>(
	name: string,
	schema: TSchema,
): PreloadBridgeOf<TSchema> {
	const channels = createChannels(name);
	return bindMembers(schema.shape as AnyShape, {
		kind: 'root',
		channels,
		path: [],
	}) as PreloadBridgeOf<TSchema>;
}
