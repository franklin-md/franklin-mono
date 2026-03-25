import {
	type MuxPacket,
	Multiplexer,
	fromObserver,
	fromCallable,
	type Duplex,
} from '@franklin/transport';
import { ipcMain, type WebContents } from 'electron';

/**
 * Creates a Level 0 Multiplexer backed by Electron IPC (main-process side).
 *
 * The raw root channel carries multiplexed packets for one BrowserWindow.
 * Packets from other windows are ignored.
 */
export function createMainIpcMux<R, W = R>(
	webContents: WebContents,
	channel: string,
): Multiplexer<R, W> {
	const readable = fromObserver<MuxPacket<R>>((callback) => {
		const handler = (_event: Electron.IpcMainEvent, packet: MuxPacket<R>) => {
			callback(packet);
		};
		ipcMain.on(channel, handler);
		return () => {
			ipcMain.removeListener(channel, handler);
		};
	});

	const writable = fromCallable<MuxPacket<W>>((packet) => {
		webContents.send(channel, packet);
	});

	const transport: Duplex<MuxPacket<R>, MuxPacket<W>> = {
		readable,
		writable,
		close: async () => {
			readable.cancel().catch(() => {});
		},
	};

	return new Multiplexer(transport);
}
