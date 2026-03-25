import { randomUUID } from 'node:crypto';

import { connect, type Duplex } from '@franklin/transport';
import { ipcMain } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import type { BoundWindow } from './types.js';
import { closeTunnel, getValueAtPath } from './bound-window.js';

export function registerTransportHandler(
	name: string,
	binding: BoundWindow,
	path: string[],
): Array<() => void> {
	const channels = createChannels(name);
	const connectChannel = channels.getTransportConnectChannel(path);
	const killChannel = channels.getTransportKillChannel(path);
	const streamChannel = channels.getTransportStreamChannel(path);

	ipcMain.handle(connectChannel, async (_event, ...args: unknown[]) => {
		const connectTransport = getValueAtPath(binding.impl, path) as (
			...connectArgs: unknown[]
		) => Promise<Duplex<unknown, unknown>>;
		const localTransport = await connectTransport(...args);
		const id = randomUUID();
		const remoteTransport = binding.rootMux.channel(
			`${streamChannel}:${id}`,
		);
		const tunnel = connect(localTransport, remoteTransport);

		binding.tunnels.set(id, tunnel);
		return id;
	});

	ipcMain.handle(killChannel, async (_event, id: string) => {
		await closeTunnel(binding, id);
	});

	return [
		() => ipcMain.removeHandler(connectChannel),
		() => ipcMain.removeHandler(killChannel),
	];
}
