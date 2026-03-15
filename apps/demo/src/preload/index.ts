import type {
	MultiplexedEventInterface,
	MultiplexedPacket,
} from '@franklin/transport';
import { contextBridge, ipcRenderer } from 'electron';

const ipcStream: MultiplexedEventInterface<unknown> = {
	on: (callback: (packet: MultiplexedPacket<unknown>) => void) => {
		return () => {
			ipcRenderer.on(
				'ipc-stream',
				(_event, packet: MultiplexedPacket<unknown>) => {
					callback(packet);
				},
			);
		};
	},
	invoke: (packet: MultiplexedPacket<unknown>) => {
		ipcRenderer.send('ipc-stream', packet);
	},
};

contextBridge.exposeInMainWorld('ipcStream', ipcStream);
