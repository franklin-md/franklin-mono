import { ipcRenderer } from 'electron';

import type { FranklinIpcRuntime } from '../shared/api.js';

/**
 * Creates a scoped IPC runtime. All channels are automatically prefixed
 * with the given namespace — callers use relative channel names.
 */
export function bindPreloadIpc(namespace: string): FranklinIpcRuntime {
	return {
		invoke(channel: string, ...args: unknown[]): Promise<unknown> {
			return ipcRenderer.invoke(
				`${namespace}:${channel}`,
				...args,
			) as Promise<unknown>;
		},

		send(channel: string, packet: unknown): void {
			ipcRenderer.send(`${namespace}:${channel}`, packet);
		},

		subscribe(
			channel: string,
			listener: (packet: unknown) => void,
		): () => void {
			const fullChannel = `${namespace}:${channel}`;
			const handler = (_event: Electron.IpcRendererEvent, packet: unknown) => {
				listener(packet);
			};
			ipcRenderer.on(fullChannel, handler);
			return () => {
				ipcRenderer.removeListener(fullChannel, handler);
			};
		},
	};
}
