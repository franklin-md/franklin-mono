import { contextBridge, ipcRenderer } from 'electron';

import {
	IPC_STREAM,
	AGENT_SPAWN,
	AGENT_KILL,
	MCP_START,
	MCP_STOP,
	AUTH_GET_PROVIDERS,
	AUTH_GET_CANONICAL_PROVIDERS,
	AUTH_LOAD,
	AUTH_OPEN_EXTERNAL,
	AUTH_SET_ENTRY,
	AUTH_REMOVE_ENTRY,
	AUTH_START_LOGIN,
	AUTH_PROMPT_RESPONSE,
	AUTH_OAUTH_ON_AUTH,
	AUTH_OAUTH_ON_PROGRESS,
	AUTH_OAUTH_ON_PROMPT,
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
// Auth bridge
// ---------------------------------------------------------------------------

const auth = {
	getProviders: (): Promise<Array<{ id: string; name: string }>> =>
		ipcRenderer.invoke(AUTH_GET_PROVIDERS) as Promise<
			Array<{ id: string; name: string }>
		>,
	getCanonicalProviders: (): Promise<string[]> =>
		ipcRenderer.invoke(AUTH_GET_CANONICAL_PROVIDERS) as Promise<string[]>,

	load: (): Promise<unknown> => ipcRenderer.invoke(AUTH_LOAD),

	setEntry: (provider: string, entry: unknown): Promise<void> =>
		ipcRenderer.invoke(AUTH_SET_ENTRY, provider, entry) as Promise<void>,

	removeEntry: (provider: string): Promise<void> =>
		ipcRenderer.invoke(AUTH_REMOVE_ENTRY, provider) as Promise<void>,

	openExternal: (url: string): Promise<void> =>
		ipcRenderer.invoke(AUTH_OPEN_EXTERNAL, url) as Promise<void>,

	/** Starts the OAuth flow in main. Resolves when the flow completes. */
	startLogin: (
		provider: string,
		flowId: string,
	): Promise<{ success: boolean; error?: string }> =>
		ipcRenderer.invoke(AUTH_START_LOGIN, provider, flowId) as Promise<{
			success: boolean;
			error?: string;
		}>,

	sendPromptResponse: (flowId: string, value: string): void => {
		ipcRenderer.send(AUTH_PROMPT_RESPONSE, flowId, value);
	},

	onOAuthAuth: (
		cb: (flowId: string, info: { url: string; instructions?: string }) => void,
	) => {
		const handler = (
			_e: Electron.IpcRendererEvent,
			flowId: string,
			info: unknown,
		) => cb(flowId, info as { url: string; instructions?: string });
		ipcRenderer.on(AUTH_OAUTH_ON_AUTH, handler);
		return () => ipcRenderer.removeListener(AUTH_OAUTH_ON_AUTH, handler);
	},

	onOAuthProgress: (cb: (flowId: string, message: string) => void) => {
		const handler = (
			_e: Electron.IpcRendererEvent,
			flowId: string,
			message: string,
		) => cb(flowId, message);
		ipcRenderer.on(AUTH_OAUTH_ON_PROGRESS, handler);
		return () => ipcRenderer.removeListener(AUTH_OAUTH_ON_PROGRESS, handler);
	},

	onOAuthPrompt: (
		cb: (
			flowId: string,
			prompt: { message: string; placeholder?: string; allowEmpty?: boolean },
		) => void,
	) => {
		const handler = (
			_e: Electron.IpcRendererEvent,
			flowId: string,
			prompt: unknown,
		) =>
			cb(flowId, prompt as { message: string; placeholder?: string; allowEmpty?: boolean });
		ipcRenderer.on(AUTH_OAUTH_ON_PROMPT, handler);
		return () => ipcRenderer.removeListener(AUTH_OAUTH_ON_PROMPT, handler);
	},
};

// ---------------------------------------------------------------------------
// Expose to renderer (underscore-prefixed — this is plumbing, not user-facing)
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('__franklinBridge', {
	ipcStream,
	agent,
	mcp,
	auth,
});
