import { contextBridge, ipcRenderer } from 'electron';

import {
	IPC_STREAM,
	ENV_PROVISION,
	ENV_DISPOSE,
	AGENT_SPAWN,
	AGENT_KILL,
	MCP_START,
	MCP_STOP,
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
// Framework lifecycle (environment provisioning/disposal)
// ---------------------------------------------------------------------------

const framework = {
	provision: (opts?: unknown): Promise<string> =>
		ipcRenderer.invoke(ENV_PROVISION, opts) as Promise<string>,

	dispose: (envId: string): Promise<void> =>
		ipcRenderer.invoke(ENV_DISPOSE, envId) as Promise<void>,
};

// ---------------------------------------------------------------------------
// Agent lifecycle (request/response over invoke)
// ---------------------------------------------------------------------------

const agent = {
	spawn: (envId: string, name: string): Promise<string> =>
		ipcRenderer.invoke(AGENT_SPAWN, envId, name) as Promise<string>,

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
// Expose to renderer (underscore-prefixed — this is plumbing, not user-facing)
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('__franklinBridge', {
	ipcStream,
	framework,
	agent,
	mcp,
});
