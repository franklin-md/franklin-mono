import { randomUUID } from 'node:crypto';

import { ipcMain } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import { closeLease } from './registry/leases.js';
import type { BindingContext, BoundLease } from './types.js';

export type LeaseFactory = (
	id: string,
	...args: unknown[]
) => Promise<BoundLease>;

export function registerLeaseLifecycle(
	name: string,
	context: BindingContext,
	path: string[],
	createLease: LeaseFactory,
): Array<() => void> {
	const channels = createChannels(name);
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
