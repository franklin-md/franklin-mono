import { randomUUID } from 'node:crypto';

import { ipcMain } from 'electron';
import {
	isMethodDescriptor,
	isNamespaceDescriptor,
	isStreamDescriptor,
	getValueAtPath,
} from '@franklin/lib/proxy';
import type {
	AnyShape,
	NamespaceDescriptor,
	ResourceDescriptor,
	ServerRuntime,
} from '@franklin/lib/proxy';
import { connect } from '@franklin/transport';
import type { Duplex } from '@franklin/transport';

import type { ChannelNamespace } from '../../../shared/channels.js';
import { createBoundLease, closeLease } from './registry/leases.js';
import type { BindingContext, BoundLease } from './types.js';

export function createServerRuntime(
	channels: ChannelNamespace,
	context: BindingContext,
): ServerRuntime {
	function registerLeaseLifecycle(
		path: string[],
		createLease: (id: string, ...args: unknown[]) => Promise<BoundLease>,
	): Array<() => void> {
		const connectChannel = channels.getLeaseConnectChannel(path);
		const killChannel = channels.getLeaseKillChannel(path);

		ipcMain.handle(connectChannel, async (_event, ...args: unknown[]) => {
			const id = randomUUID();
			const lease = await createLease(id, ...args);
			context.leases.set(id, lease);
			return id;
		});

		ipcMain.handle(killChannel, async (_event, id: string) => {
			await closeLease(context, id);
		});

		return [
			() => ipcMain.removeHandler(connectChannel),
			() => ipcMain.removeHandler(killChannel),
		];
	}

	function registerTransport(
		path: string[],
		factory: (...args: unknown[]) => Promise<unknown>,
	): Array<() => void> {
		const streamChannel = channels.getDuplexStreamChannel(path);

		return registerLeaseLifecycle(path, async (id, ...args) => {
			const localTransport = (await factory(...args)) as Duplex<
				unknown,
				unknown
			>;
			const remoteTransport = context.rootMux.channel(`${streamChannel}:${id}`);
			const tunnel = connect(localTransport, remoteTransport);

			return createBoundLease(localTransport, async () => {
				await tunnel.close();
			});
		});
	}

	function registerHandle(
		path: string[],
		inner: NamespaceDescriptor<any, any>,
		factory: (...args: unknown[]) => Promise<unknown>,
	): Array<() => void> {
		return [
			...registerLeaseLifecycle(path, async (_id, ...args) => {
				const value = await factory(...args);
				return createBoundLease(value);
			}),
			...registerHandleMembers(path, [], inner.shape as AnyShape),
		];
	}

	function registerHandleMembers(
		handlePath: string[],
		memberPath: string[],
		shape: AnyShape,
	): Array<() => void> {
		const unregister: Array<() => void> = [];

		for (const [key, descriptor] of Object.entries(shape)) {
			const nextMemberPath = [...memberPath, key];

			if (isNamespaceDescriptor(descriptor)) {
				unregister.push(
					...registerHandleMembers(
						handlePath,
						nextMemberPath,
						descriptor.shape as AnyShape,
					),
				);
				continue;
			}

			if (!isMethodDescriptor(descriptor)) {
				throw new Error(
					`Unsupported descriptor inside leased proxy at ${[...handlePath, ...nextMemberPath].join('.')}`,
				);
			}

			const methodChannel = channels.getLeaseMethodChannel(
				handlePath,
				nextMemberPath,
			);
			ipcMain.handle(
				methodChannel,
				async (_event, id: string, ...args: unknown[]) => {
					const lease = context.leases.get(id);
					if (!lease) {
						throw new Error(`No lease registered for ${id}`);
					}
					const method = getValueAtPath(lease.value, nextMemberPath) as (
						...methodArgs: unknown[]
					) => Promise<unknown>;
					return await method(...args);
				},
			);

			unregister.push(() => ipcMain.removeHandler(methodChannel));
		}

		return unregister;
	}

	return {
		registerMethod(
			path: string[],
			handler: (...args: unknown[]) => Promise<unknown>,
		): () => void {
			const channel = channels.getMethodChannel(path);
			ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
				return await handler(...args);
			});
			return () => ipcMain.removeHandler(channel);
		},

		registerResource(
			path: string[],
			descriptor: ResourceDescriptor<any, any>,
			factory: (...args: unknown[]) => Promise<unknown>,
		): Array<() => void> {
			if (isStreamDescriptor(descriptor.inner)) {
				return registerTransport(path, factory);
			}
			if (isNamespaceDescriptor(descriptor.inner)) {
				return registerHandle(path, descriptor.inner, factory);
			}
			throw new Error(
				`Unsupported resource inner descriptor at ${path.join('.')}`,
			);
		},
	};
}
