import type { Duplex } from '@franklin/transport';
import { ipcMain, type WebContents } from 'electron';

import { isIpcStreamMessage, type IpcStreamMessage } from '../../shared/api.js';

/**
 * Creates a direct Electron IPC duplex for one BrowserWindow and one schema path.
 */
export function createMainIpcStream<R, W = R>(
	webContents: WebContents,
	channel: string,
	onRemoteClose?: () => Promise<void> | void,
): Duplex<R, W> {
	let controller: ReadableStreamDefaultController<R> | null = null;
	let unsubscribe: (() => void) | null = null;
	let closePromise: Promise<void> | null = null;
	let closed = false;

	const detach = () => {
		if (unsubscribe == null) return;
		unsubscribe();
		unsubscribe = null;
	};

	const closeReadable = () => {
		if (controller == null) return;
		try {
			controller.close();
		} catch {
			// ReadableStream controllers throw if already closed.
		}
	};

	const closeStream = (notifyPeer: boolean): Promise<void> => {
		if (closePromise) {
			return closePromise;
		}

		closePromise = (async () => {
			if (closed) return;
			closed = true;
			detach();
			closeReadable();
			if (notifyPeer) {
				webContents.send(channel, { kind: 'close' } satisfies IpcStreamMessage);
			}
		})();

		return closePromise;
	};

	const readable = new ReadableStream<R>({
		start(nextController) {
			controller = nextController;
			const handler = (event: Electron.IpcMainEvent, packet: unknown) => {
				if (event.sender.id !== webContents.id || closed) {
					return;
				}
				if (!isIpcStreamMessage(packet)) {
					return;
				}
				if (packet.kind === 'data') {
					nextController.enqueue(packet.data as R);
					return;
				}
				void closeStream(false).then(() => onRemoteClose?.());
			};
			ipcMain.on(channel, handler);
			unsubscribe = () => {
				ipcMain.removeListener(channel, handler);
			};
		},
		cancel() {
			return closeStream(true);
		},
	});

	const writable = new WritableStream<W>({
		write(packet) {
			if (closed) {
				throw new Error('IPC stream is closed');
			}
			webContents.send(channel, { kind: 'data', data: packet });
		},
		close() {
			return closeStream(true);
		},
		abort() {
			return closeStream(true);
		},
	});

	return {
		readable,
		writable,
		close: () => closeStream(true),
	};
}
