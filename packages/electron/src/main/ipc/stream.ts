import {
	createMultiplexedEventStream,
	type MultiplexedPacket,
	type Duplex,
} from '@franklin/transport';
import { ipcMain, type WebContents } from 'electron';

import { IPC_STREAM } from '../../shared/channels.js';

/**
 * Creates a Duplex stream backed by Electron IPC (main-process side).
 *
 * Level 1 demux: the raw `IPC_STREAM` channel carries multiplexed packets.
 * This function returns a single named stream (e.g. "agent-transport")
 * sliced out of that shared channel.
 */
export function createMainIpcStream<T>(
	streamName: string,
	webContents: WebContents,
): Duplex<T> {
	const on = (callback: (packet: MultiplexedPacket<T>) => void) => {
		const handler = (
			_event: Electron.IpcMainEvent,
			packet: MultiplexedPacket<T>,
		) => {
			callback(packet);
		};
		ipcMain.on(IPC_STREAM, handler);
		return () => {
			ipcMain.removeListener(IPC_STREAM, handler);
		};
	};

	const invoke = (packet: MultiplexedPacket<T>) => {
		webContents.send(IPC_STREAM, packet);
	};

	return createMultiplexedEventStream<T>(streamName, { on, invoke });
}
