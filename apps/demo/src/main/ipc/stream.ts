import {
	createMultiplexedEventStream,
	type MultiplexedPacket,
	type Stream,
} from '@franklin/transport';
import { ipcMain, type WebContents } from 'electron/main';

// Give Stream like semantics to the IPC channel
// TODO: Check what type T is. It's basically any data that can be sent via IPC (which is frozen types?)
export function createMainIpcStream<T>(
	streamName: string,
	webContents: WebContents,
): Stream<T> {
	const on = (callback: (packet: MultiplexedPacket<T>) => void) => {
		return () => {
			ipcMain.on('ipc-stream', (_event, packet: MultiplexedPacket<T>) => {
				callback(packet);
			});
		};
	};

	const invoke = (packet: MultiplexedPacket<T>) => {
		webContents.send('ipc-stream', packet);
	};

	return createMultiplexedEventStream<T>(streamName, { on, invoke });
}
