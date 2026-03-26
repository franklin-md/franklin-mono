import { ipcMain } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import {
	isMethodDescriptor,
	isProxyDescriptor,
} from '../../../shared/descriptors/detect.js';
import type {
	HandleDescriptor,
	HandleMemberDescriptor,
} from '../../../shared/descriptors/types.js';
import { serializeProxy } from '../../../shared/descriptors/serde.js';
import {
	createBoundLease,
	getBoundLease,
	getValueAtPath,
} from './bound-window.js';
import { registerLeaseLifecycle } from './lease.js';
import type { BoundWindow } from './types.js';

export function registerHandleHandler(
	name: string,
	binding: BoundWindow,
	path: string[],
	descriptor: HandleDescriptor<any, any, any>,
): Array<() => void> {
	return [
		...registerLeaseLifecycle(name, binding, path, async (_id, ...args) => {
			const createHandle = getValueAtPath(binding.impl, path) as (
				...connectArgs: unknown[]
			) => Promise<unknown>;
			const value = await createHandle(...args);
			return createBoundLease(value);
		}),
		...registerHandleMembers(name, binding, path, [], descriptor.shape),
	];
}

function registerHandleMembers(
	name: string,
	binding: BoundWindow,
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
					binding,
					handlePath,
					nextMemberPath,
					descriptor.shape as Record<string, HandleMemberDescriptor>,
				),
			);
			continue;
		}

		if (!isMethodDescriptor(descriptor)) {
			throw new Error(
				`Unsupported descriptor inside handle at ${[...handlePath, ...nextMemberPath].join('.')}`,
			);
		}

		const methodChannel = channels.getHandleMethodChannel(
			handlePath,
			nextMemberPath,
		);
		ipcMain.handle(
			methodChannel,
			async (_event, id: string, ...args: unknown[]) => {
				const lease = getBoundLease(binding, id);
				if (!lease) {
					throw new Error(`No lease registered for ${id}`);
				}

				const method = getValueAtPath(lease.value, nextMemberPath) as (
					...methodArgs: unknown[]
				) => Promise<unknown>;
				const result = await method(...args);
				return descriptor.returns
					? await serializeProxy(result, descriptor.returns)
					: result;
			},
		);

		unregister.push(() => ipcMain.removeHandler(methodChannel));
	}

	return unregister;
}
