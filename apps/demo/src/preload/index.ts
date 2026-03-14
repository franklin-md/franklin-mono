import { contextBridge, ipcRenderer } from 'electron';

export interface FranklinBridge {
	spawn(agentName: string, cwd: string): Promise<string>;
	send(agentId: string, chunk: Uint8Array): void;
	onData(callback: (agentId: string, chunk: Uint8Array) => void): () => void;
	dispose(agentId: string): Promise<void>;
	startMcp(
		serializedTools: unknown[],
	): Promise<{ config: unknown; mcpId: string }>;
	stopMcp(mcpId: string): Promise<void>;
}

// Relay subprocess stdout from main → renderer data listeners
const dataListeners = new Set<(agentId: string, chunk: Uint8Array) => void>();

ipcRenderer.on(
	'franklin:relay-data',
	(_event: Electron.IpcRendererEvent, agentId: string, chunk: Uint8Array) => {
		for (const listener of dataListeners) {
			listener(agentId, chunk);
		}
	},
);

const bridge: FranklinBridge = {
	spawn: (agentName: string, cwd: string) =>
		ipcRenderer.invoke('franklin:spawn', agentName, cwd) as Promise<string>,

	send: (agentId: string, chunk: Uint8Array) =>
		ipcRenderer.send('franklin:relay-data', agentId, chunk),

	onData: (callback: (agentId: string, chunk: Uint8Array) => void) => {
		dataListeners.add(callback);
		return () => {
			dataListeners.delete(callback);
		};
	},

	dispose: (agentId: string) =>
		ipcRenderer.invoke('franklin:dispose', agentId) as Promise<void>,

	startMcp: (serializedTools: unknown[]) =>
		ipcRenderer.invoke('franklin:start-mcp', serializedTools) as Promise<{
			config: unknown;
			mcpId: string;
		}>,

	stopMcp: (mcpId: string) =>
		ipcRenderer.invoke('franklin:stop-mcp', mcpId) as Promise<void>,
};

contextBridge.exposeInMainWorld('franklinBridge', bridge);
