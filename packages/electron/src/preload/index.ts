import { contextBridge, ipcRenderer } from 'electron';

import {
	IPC_STREAM,
	AGENT_SPAWN,
	AGENT_KILL,
	MCP_START,
	MCP_STOP,
	PERSIST_READ_FILE,
	PERSIST_WRITE_FILE,
	PERSIST_READ_DIR,
	PERSIST_DELETE_FILE,
	PERSIST_MKDIR,
} from '../shared/channels.js';

// ---------------------------------------------------------------------------
// IPC stream (bidirectional multiplexed data channel)
// ---------------------------------------------------------------------------

const ipcStream = {
	on: (callback: (packet: unknown) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, packet: unknown) => {
			callback(packet);
		};
		ipcRenderer.on(IPC_STREAM, handler);
		return () => {
			ipcRenderer.removeListener(IPC_STREAM, handler);
		};
	},
	invoke: (packet: unknown) => {
		ipcRenderer.send(IPC_STREAM, packet);
	},
};

// ---------------------------------------------------------------------------
// Agent lifecycle (request/response over invoke)
// ---------------------------------------------------------------------------

const agent = {
	spawn: (): Promise<string> =>
		ipcRenderer.invoke(AGENT_SPAWN) as Promise<string>,

	kill: (agentId: string): Promise<void> =>
		ipcRenderer.invoke(AGENT_KILL, agentId) as Promise<void>,
};

// ---------------------------------------------------------------------------
// MCP lifecycle (request/response over invoke)
// ---------------------------------------------------------------------------

const mcp = {
	start: (mcpId: string, name: string, tools: unknown): Promise<unknown> =>
		ipcRenderer.invoke(MCP_START, mcpId, name, tools) as Promise<unknown>,

	stop: (mcpId: string): Promise<void> =>
		ipcRenderer.invoke(MCP_STOP, mcpId) as Promise<void>,
};

// ---------------------------------------------------------------------------
// Persist (file I/O bridged to main process)
// ---------------------------------------------------------------------------

const persist = {
	readFile: (path: string): Promise<string> =>
		ipcRenderer.invoke(PERSIST_READ_FILE, path) as Promise<string>,

	writeFile: (path: string, data: string): Promise<void> =>
		ipcRenderer.invoke(PERSIST_WRITE_FILE, path, data) as Promise<void>,

	readDir: (path: string): Promise<string[]> =>
		ipcRenderer.invoke(PERSIST_READ_DIR, path) as Promise<string[]>,

	deleteFile: (path: string): Promise<void> =>
		ipcRenderer.invoke(PERSIST_DELETE_FILE, path) as Promise<void>,

	mkdir: (path: string): Promise<void> =>
		ipcRenderer.invoke(PERSIST_MKDIR, path) as Promise<void>,
};

// ---------------------------------------------------------------------------
// Expose to renderer (underscore-prefixed — this is plumbing, not user-facing)
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('__franklinBridge', {
	ipcStream,
	agent,
	mcp,
	persist,
});
