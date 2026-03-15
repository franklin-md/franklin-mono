import type {
	MultiplexedEventInterface,
	MultiplexedPacket,
} from '@franklin/transport';
import { contextBridge, ipcRenderer } from 'electron';

// ---------------------------------------------------------------------------
// IPC stream (bidirectional multiplexed data channel)
// ---------------------------------------------------------------------------

const ipcStream: MultiplexedEventInterface<unknown> = {
	on: (callback: (packet: MultiplexedPacket<unknown>) => void) => {
		const handler = (
			_event: Electron.IpcRendererEvent,
			packet: MultiplexedPacket<unknown>,
		) => {
			callback(packet);
		};
		ipcRenderer.on('ipc-stream', handler);
		return () => {
			ipcRenderer.removeListener('ipc-stream', handler);
		};
	},
	invoke: (packet: MultiplexedPacket<unknown>) => {
		ipcRenderer.send('ipc-stream', packet);
	},
};

// ---------------------------------------------------------------------------
// Agent lifecycle (request/response over invoke)
// ---------------------------------------------------------------------------

const agent = {
	/** Spawn an agent subprocess in main by name. Returns the agentId (main owns IDs). */
	spawn: (name: string): Promise<string> =>
		ipcRenderer.invoke('agent:spawn', name) as Promise<string>,

	/** Kill an agent subprocess by ID. */
	kill: (agentId: string): Promise<void> =>
		ipcRenderer.invoke('agent:kill', agentId) as Promise<void>,
};

// ---------------------------------------------------------------------------
// Expose to renderer
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('ipcStream', ipcStream);
contextBridge.exposeInMainWorld('agent', agent);
