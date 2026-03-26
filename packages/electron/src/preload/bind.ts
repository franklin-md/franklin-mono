import { ipcRenderer } from 'electron';
import {
	isMethodDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';
import type { AnyShape, NamespaceDescriptor } from '@franklin/lib/proxy';
import { createChannels } from '../shared/channels.js';
import type { IpcStreamBridge, PreloadBridgeOf } from '../shared/api.js';

// TODO: Refactor and clean up.

type BindContext =
	| { kind: 'root'; name: string; path: string[] }
	| {
			kind: 'lease';
			name: string;
			leasePath: string[];
			memberPath: string[];
	  };

// TODO: This is to support the tranport runtime. But just like lease it should go into the
// bind context type and into the single recursion method
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
	shape: AnyShape,
	context: BindContext,
): Record<string, unknown> {
	const channels = createChannels(context.name);
	const node: Record<string, unknown> = {};

	for (const [key, descriptor] of Object.entries(shape)) {
		if (isNamespaceDescriptor(descriptor)) {
			node[key] = bindMembers(
				descriptor.shape,
				context.kind === 'root'
					? { kind: 'root', name: context.name, path: [...context.path, key] }
					: {
							kind: 'lease',
							name: context.name,
							leasePath: context.leasePath,
							memberPath: [...context.memberPath, key],
						},
			);
			continue;
		}

		if (isMethodDescriptor(descriptor)) {
			const channel =
				context.kind === 'root'
					? channels.getMethodChannel([...context.path, key])
					: channels.getLeaseMethodChannel(context.leasePath, [
							...context.memberPath,
							key,
						]);
			node[key] =
				context.kind === 'root'
					? (...invokeArgs: unknown[]) =>
							ipcRenderer.invoke(channel, ...invokeArgs)
					: (id: string, ...invokeArgs: unknown[]) =>
							ipcRenderer.invoke(channel, id, ...invokeArgs);
			continue;
		}

		if (context.kind !== 'root') {
			throw new Error(`Unsupported descriptor inside leased proxy at ${key}`);
		}

		const nextPath = [...context.path, key];
		if (isResourceDescriptor(descriptor)) {
			const leaseBridge: Record<string, unknown> = {
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
			node[key] = leaseBridge;

			if (isNamespaceDescriptor(descriptor.inner)) {
				leaseBridge.proxy = bindMembers(descriptor.inner.shape, {
					kind: 'lease',
					name: context.name,
					leasePath: nextPath,
					memberPath: [],
				});
			} else if (!isStreamDescriptor(descriptor.inner)) {
				throw new Error(`Unsupported leased value at ${nextPath.join('.')}`);
			}
		}
	}

	return node;
}

export function bindPreload<TSchema extends NamespaceDescriptor<any, any>>(
	name: string,
	schema: TSchema,
): PreloadBridgeOf<TSchema> {
	return bindMembers(schema.shape as AnyShape, {
		kind: 'root',
		name,
		path: [],
	}) as PreloadBridgeOf<TSchema>;
}
