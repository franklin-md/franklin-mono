import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import { getValueAtPath } from '@franklin/lib/proxy';
import type {
	ServerRuntime,
	ServerResourceBinding,
	ResourceHandle,
	MethodHandler,
	StreamFactory,
} from '@franklin/lib/proxy';
import { connect } from '@franklin/transport';
import type { Duplex } from '@franklin/transport';

import type { ChannelScope } from '../../../shared/channels.js';
import { createMainIpcStream } from '../stream.js';

export function createServerRuntime(
	scope: ChannelScope,
	webContents: WebContents,
): ServerRuntime {
	return {
		registerMethod(path: string[], handler?: MethodHandler): () => void {
			if (!handler) {
				throw new Error(
					`registerMethod requires a handler at ${path.join('.')}`,
				);
			}
			const channel = scope.method(path);
			ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
				return await handler(...args);
			});
			return () => ipcMain.removeHandler(channel);
		},

		registerStream(path: string[], factory?: StreamFactory): () => void {
			if (!factory) {
				throw new Error(
					`registerStream requires a factory at ${path.join('.')}`,
				);
			}
			const localTransport = factory() as Duplex<unknown, unknown>;
			let tunnel: Duplex<unknown, unknown> | null = null;
			let closePromise: Promise<void> | null = null;

			const closeStream = async () => {
				if (closePromise) return closePromise;
				closePromise = (async () => {
					await tunnel?.close();
				})();
				return closePromise;
			};

			const remoteTransport = createMainIpcStream(
				webContents,
				scope.stream(path),
				async () => {
					await closeStream();
				},
			);
			tunnel = connect(localTransport, remoteTransport);

			return () => {
				void closeStream();
			};
		},

		registerResource(
			path: string[],
			handle: ResourceHandle,
		): ServerResourceBinding {
			const res = scope.resource(path);
			const innerScope = res.inner();

			ipcMain.handle(res.connect, async (_event, ...args: unknown[]) => {
				return await handle.connect(...args);
			});
			ipcMain.handle(res.kill, async (_event, id: string) => {
				await handle.kill(id);
			});

			return {
				unregister: [
					() => ipcMain.removeHandler(res.connect),
					() => ipcMain.removeHandler(res.kill),
				],
				inner(): ServerRuntime {
					return createResourceInnerRuntime(innerScope, handle, webContents);
				},
			};
		},
	};
}

function createResourceInnerRuntime(
	scope: ChannelScope,
	handle: ResourceHandle,
	webContents: WebContents,
): ServerRuntime {
	return {
		registerMethod(path: string[]): () => void {
			const channel = scope.method(path);
			ipcMain.handle(
				channel,
				async (_event, id: string, ...args: unknown[]) => {
					const instance = handle.get(id);
					const parent =
						path.length > 1
							? getValueAtPath(instance, path.slice(0, -1))
							: instance;
					const methodName = path[path.length - 1] as string;
					const method = (
						parent as Record<string, (...a: unknown[]) => Promise<unknown>>
					)[methodName] as (...a: unknown[]) => Promise<unknown>;
					return await method.call(parent, ...args);
				},
			);
			return () => ipcMain.removeHandler(channel);
		},

		registerStream(path: string[]): () => void {
			const unsub = handle.onConnect((id, value) => {
				const localTransport = (
					path.length > 0 ? getValueAtPath(value, path) : value
				) as Duplex<unknown, unknown>;
				// Per-instance stream channel: static channel + ':' + instance ID
				const channel = `${scope.stream(path)}:${id}`;
				const remoteTransport = createMainIpcStream(
					webContents,
					channel,
					async () => {
						await handle.kill(id);
					},
				);
				connect(localTransport, remoteTransport);
			});
			return unsub;
		},
	};
}
