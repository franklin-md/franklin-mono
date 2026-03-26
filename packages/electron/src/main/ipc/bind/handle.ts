import { ipcMain } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import {
	isMethodDescriptor,
	isProxyDescriptor,
} from '../../../shared/descriptors/detect.js';
import type {
	HandleMemberDescriptor,
	ProxyDescriptor,
} from '../../../shared/descriptors/types.js';
import { getValueAtPath } from './lookup.js';
import { registerLeaseLifecycle } from './lease.js';
import { createBoundLease, getBoundLease } from './registry/leases.js';
import type { BindingContext } from './types.js';

export function registerHandleHandler(
	name: string,
	context: BindingContext,
	path: string[],
	descriptor: ProxyDescriptor<any, any>,
): Array<() => void> {
	return [
		...registerLeaseLifecycle(name, context, path, async (_id, ...args) => {
			const createHandle = getValueAtPath(context.impl, path) as (
				...connectArgs: unknown[]
			) => Promise<unknown>;
			const value = await createHandle(...args);
			return createBoundLease(value);
		}),
		...registerHandleMembers(
			name,
			context,
			path,
			[],
			descriptor.shape as Record<string, HandleMemberDescriptor>,
		),
	];
}

function registerHandleMembers(
	name: string,
	context: BindingContext,
	handlePath: string[],
	memberPath: string[],
	shape: Record<string, HandleMemberDescriptor>,
): Array<() => void> {
	const channels = createChannels(name);
	const unregister: Array<() => void> = [];

	for (const [key, descriptor] of Object.entries(shape) as Array<
		[string, HandleMemberDescriptor]
	>) {
		const nextMemberPath = [...memberPath, key];

		if (isProxyDescriptor(descriptor)) {
			unregister.push(
				...registerHandleMembers(
					name,
					context,
					handlePath,
					nextMemberPath,
					descriptor.shape as Record<string, HandleMemberDescriptor>,
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
				const lease = getBoundLease(context, id);
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
