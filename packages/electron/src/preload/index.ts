import { contextBridge, ipcRenderer } from 'electron';

import { bindPreload } from './bind.js';
import { schema } from '../shared/schema.js';
import {
	AUTH_LOAD,
	AUTH_GET_CANONICAL_PROVIDERS,
	AUTH_GET_API_KEY,
	AUTH_OAUTH_ON_AUTH,
	AUTH_OAUTH_ON_PROGRESS,
	AUTH_OAUTH_ON_PROMPT,
	AUTH_ON_CHANGE,
	AUTH_SET_ENTRY,
	AUTH_OPEN_EXTERNAL,
	AUTH_PROMPT_RESPONSE,
	AUTH_REMOVE_ENTRY,
	AUTH_START_LOGIN,
	AUTH_GET_PROVIDERS,
} from '../shared/channels.js';

contextBridge.exposeInMainWorld(
	'__franklinBridge',
	bindPreload('franklin', schema),
);

const auth = {
	getProviders: (): Promise<Array<{ id: string; name: string }>> =>
		ipcRenderer.invoke(AUTH_GET_PROVIDERS) as Promise<
			Array<{ id: string; name: string }>
		>,
	getCanonicalProviders: (): Promise<string[]> =>
		ipcRenderer.invoke(AUTH_GET_CANONICAL_PROVIDERS) as Promise<string[]>,

	load: (): Promise<unknown> => ipcRenderer.invoke(AUTH_LOAD),

	getApiKey: (provider: string): Promise<string | undefined> =>
		ipcRenderer.invoke(AUTH_GET_API_KEY, provider) as Promise<
			string | undefined
		>,

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
			cb(
				flowId,
				prompt as {
					message: string;
					placeholder?: string;
					allowEmpty?: boolean;
				},
			);
		ipcRenderer.on(AUTH_OAUTH_ON_PROMPT, handler);
		return () => ipcRenderer.removeListener(AUTH_OAUTH_ON_PROMPT, handler);
	},

	onAuthChange: (
		cb: (provider: string, authKey: string | undefined) => void,
	) => {
		const handler = (
			_e: Electron.IpcRendererEvent,
			provider: string,
			authKey: string | undefined,
		) => cb(provider, authKey);
		ipcRenderer.on(AUTH_ON_CHANGE, handler);
		return () => ipcRenderer.removeListener(AUTH_ON_CHANGE, handler);
	},
};
contextBridge.exposeInMainWorld('__franklinAuth', auth);
