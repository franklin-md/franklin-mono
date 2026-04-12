import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type {
	ServerRuntime,
	ServerResourceBinding,
	ResourceLifecycle,
	MethodHandler,
} from '@franklin/lib/proxy';
import { connect } from '@franklin/transport';
import type { Duplex } from '@franklin/transport';

import { createMainIpcStream } from '../stream.js';
import { createPaths } from '../../../shared/paths.js';

interface IpcTransportConnection {
	close(): Promise<void>;
	closeRemote(): Promise<void>;
}

interface RuntimeOptions {
	onStreamRemoteClose?: () => Promise<void> | void;
}

function connectIpcTransport(
	webContents: WebContents,
	channel: string,
	localTransport: Duplex<unknown, unknown>,
	onRemoteClose?: () => Promise<void> | void,
): IpcTransportConnection {
	let tunnel: Duplex<unknown, unknown> | null = null;
	let remoteTransport: Duplex<unknown, unknown> | null = null;
	let closeTunnelPromise: Promise<void> | null = null;
	let closeRemotePromise: Promise<void> | null = null;

	const close = async () => {
		if (closeTunnelPromise) return closeTunnelPromise;
		closeTunnelPromise = (async () => {
			await tunnel?.close();
		})();
		return closeTunnelPromise;
	};

	const closeRemote = async () => {
		if (closeRemotePromise) return closeRemotePromise;
		closeRemotePromise = (async () => {
			await remoteTransport?.close();
		})();
		return closeRemotePromise;
	};

	remoteTransport = createMainIpcStream(webContents, channel, async () => {
		await closeRemote();
		if (onRemoteClose) {
			// Resource-scoped: let the lifecycle kill handle local transport close
			await onRemoteClose();
		} else {
			// Direct stream: close the tunnel (which closes the local transport)
			await close();
		}
	});
	tunnel = connect(localTransport, remoteTransport);

	return { close, closeRemote };
}

export function createServerRuntime(
	prefix: string,
	webContents: WebContents,
	options?: RuntimeOptions,
): ServerRuntime {
	const paths = createPaths(prefix);
	return {
		registerNamespace(key: string): ServerRuntime {
			return createServerRuntime(paths.forNamespace(key), webContents, options);
		},

		registerMethod(handler: MethodHandler): () => void {
			const channel = paths.forMethod();
			ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
				return await handler(...args);
			});
			return () => ipcMain.removeHandler(channel);
		},

		// TODO: rename to registerTransport when stream() descriptor is renamed
		registerStream(transport: unknown): () => void {
			const channel = paths.forStream();
			const connection = connectIpcTransport(
				webContents,
				channel,
				transport as Duplex<unknown, unknown>,
				options?.onStreamRemoteClose,
			);

			// For resource-scoped streams, only close the IPC side on
			// unregister. The resource lifecycle (kill) handles the local
			// transport close via inferDispose.
			if (options?.onStreamRemoteClose) {
				return () => {
					void connection.closeRemote();
				};
			}
			return () => {
				void connection.close();
			};
		},

		registerResource(lifecycle: ResourceLifecycle): ServerResourceBinding {
			const connectChannel = paths.forConnect();
			const killChannel = paths.forKill();

			ipcMain.handle(connectChannel, async (_event, ...args: unknown[]) => {
				return await lifecycle.connect(...args);
			});
			ipcMain.handle(killChannel, async (_event, id: string) => {
				await lifecycle.kill(id);
			});

			return {
				unregister: [
					() => ipcMain.removeHandler(connectChannel),
					() => ipcMain.removeHandler(killChannel),
				],
				create(id: string): ServerRuntime {
					return createServerRuntime(paths.forLease(id), webContents, {
						onStreamRemoteClose: () => lifecycle.kill(id),
					});
				},
			};
		},
	};
}
