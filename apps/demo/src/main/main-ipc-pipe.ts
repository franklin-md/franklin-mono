import type { IpcMain, WebContents } from 'electron';
import type { Pipe } from '@franklin/transport';

export interface MainIpcPipeOptions {
	agentId: string;
	webContents: WebContents;
	ipcMain: IpcMain;
}

/**
 * Creates a Pipe backed by Electron IPC on the main process side.
 *
 * - writable: chunks written here are sent to the renderer via `webContents.send()`
 * - readable: fed by `ipcMain.on('franklin:relay-data')` filtered by agentId
 *
 * Mirror of the renderer-side RendererIpcTransport.
 */
export function createMainIpcPipe(options: MainIpcPipeOptions): {
	pipe: Pipe;
	dispose: () => void;
} {
	const { agentId, webContents, ipcMain } = options;

	let readableController: ReadableStreamDefaultController<Uint8Array>;

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			readableController = controller;
		},
	});

	// Filter incoming IPC data for this specific agent
	const onData = (
		_event: Electron.IpcMainEvent,
		id: string,
		chunk: Uint8Array,
	): void => {
		if (id === agentId) {
			readableController.enqueue(chunk);
		}
	};

	ipcMain.on('franklin:relay-data', onData);

	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			webContents.send('franklin:relay-data', agentId, chunk);
		},
	});

	return {
		pipe: { readable, writable },
		dispose() {
			ipcMain.removeListener('franklin:relay-data', onData);
			try {
				readableController.close();
			} catch {
				// Already closed
			}
		},
	};
}
