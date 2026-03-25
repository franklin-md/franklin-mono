import { contextBridge, ipcRenderer } from 'electron';
import type { Filesystem } from '@franklin/lib';

import {
	IPC_STREAM,
	AGENT_SPAWN,
	AGENT_KILL,
	MCP_START,
	MCP_STOP,
	APP_GET_STORAGE,
	FILESYSTEM_READ_FILE,
	FILESYSTEM_WRITE_FILE,
	FILESYSTEM_READ_DIR,
	FILESYSTEM_DELETE_FILE,
	FILESYSTEM_MKDIR,
	FILESYSTEM_ACCESS,
	FILESYSTEM_STAT,
	FILESYSTEM_EXISTS,
	FILESYSTEM_GLOB,
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
// App (request/response over invoke)
// ---------------------------------------------------------------------------

const appBridge = {
	getStorage: (): Promise<string> =>
		ipcRenderer.invoke(APP_GET_STORAGE) as Promise<string>,
};

// ---------------------------------------------------------------------------
// Filesystem (file I/O bridged to main process)
// ---------------------------------------------------------------------------

type SerializedFileStat = {
	isFile: boolean;
	isDirectory: boolean;
};

const filesystem: Filesystem = {
	async readFile(path) {
		const data = (await ipcRenderer.invoke(FILESYSTEM_READ_FILE, path)) as
			| Uint8Array
			| ArrayBuffer;
		return data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	},

	writeFile: (path, data) =>
		ipcRenderer.invoke(FILESYSTEM_WRITE_FILE, path, data) as Promise<void>,

	mkdir: (path, options) =>
		ipcRenderer.invoke(FILESYSTEM_MKDIR, path, options) as Promise<void>,

	access: (path) =>
		ipcRenderer.invoke(FILESYSTEM_ACCESS, path) as Promise<void>,

	async stat(path) {
		const data = (await ipcRenderer.invoke(
			FILESYSTEM_STAT,
			path,
		)) as SerializedFileStat;
		return {
			isFile: () => data.isFile,
			isDirectory: () => data.isDirectory,
		};
	},

	readdir: (path) =>
		ipcRenderer.invoke(FILESYSTEM_READ_DIR, path) as Promise<string[]>,

	exists: (path) =>
		ipcRenderer.invoke(FILESYSTEM_EXISTS, path) as Promise<boolean>,

	glob: (pattern, options) =>
		ipcRenderer.invoke(FILESYSTEM_GLOB, pattern, options) as Promise<string[]>,

	deleteFile: (path) =>
		ipcRenderer.invoke(FILESYSTEM_DELETE_FILE, path) as Promise<void>,
};

// ---------------------------------------------------------------------------
// Expose to renderer (underscore-prefixed — this is plumbing, not user-facing)
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('__franklinBridge', {
	ipcStream,
	app: appBridge,
	agent,
	mcp,
	filesystem,
});
