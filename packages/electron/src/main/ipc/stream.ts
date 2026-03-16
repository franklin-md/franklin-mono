import {
	type MuxPacket,
	Multiplexer,
	fromObserver,
	fromCallable,
	type Duplex,
} from '@franklin/transport';
import { ipcMain, type WebContents } from 'electron';

import { IPC_STREAM } from '../../shared/channels.js';

/**
 * Creates a Level 0 Multiplexer backed by Electron IPC (main-process side).
 *
 * The raw IPC_STREAM channel carries multiplexed packets.
 * Call .channel(streamName) to get a named stream (e.g. "agent-transport").
 */
export function createMainIpcMux<R, W = R>(
	webContents: WebContents,
): Multiplexer<R, W> {
	const readable = fromObserver<MuxPacket<R>>((callback) => {
		const handler = (_event: Electron.IpcMainEvent, packet: MuxPacket<R>) => {
			callback(packet);
		};
		ipcMain.on(IPC_STREAM, handler);
		return () => {
			ipcMain.removeListener(IPC_STREAM, handler);
		};
	});

	const writable = fromCallable<MuxPacket<W>>((packet) => {
		webContents.send(IPC_STREAM, packet);
	});

	const transport: Duplex<MuxPacket<R>, MuxPacket<W>> = {
		readable,
		writable,
		close: async () => {},
	};

	return new Multiplexer(transport);
}
