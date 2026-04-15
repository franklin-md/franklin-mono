import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type {
	ServerRuntime,
	MethodHandler,
	OnHandler,
	ResourceFactory,
} from '@franklin/lib/proxy';
import { connect } from '@franklin/lib/transport';
import type { Duplex } from '@franklin/lib/transport';

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
			await tunnel?.dispose();
		})();
		return closeTunnelPromise;
	};

	const closeRemote = async () => {
		if (closeRemotePromise) return closeRemotePromise;
		closeRemotePromise = (async () => {
			await remoteTransport?.dispose();
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

		registerOn(handler: OnHandler): () => void {
			const subscribeChannel = paths.forOnSubscribe();
			const unsubscribeChannel = paths.forOnUnsubscribe();
			const subscriptions = new Map<string, () => void>();

			const onSubscribe = (event: Electron.IpcMainEvent, id: string) => {
				const push = (data: unknown) => {
					webContents.send(paths.forOnEvent(id), data);
				};
				const unsub = handler(push);
				subscriptions.set(id, unsub);
			};

			const onUnsubscribe = (event: Electron.IpcMainEvent, id: string) => {
				const unsub = subscriptions.get(id);
				if (unsub) {
					unsub();
					subscriptions.delete(id);
				}
			};

			ipcMain.on(subscribeChannel, onSubscribe);
			ipcMain.on(unsubscribeChannel, onUnsubscribe);

			return () => {
				for (const unsub of subscriptions.values()) unsub();
				subscriptions.clear();
				ipcMain.removeListener(subscribeChannel, onSubscribe);
				ipcMain.removeListener(unsubscribeChannel, onUnsubscribe);
			};
		},

		// TODO: rename to registerTransport when stream() descriptor is renamed
		registerTransport(transport: unknown): () => void {
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

		registerResource(factory: ResourceFactory): () => Promise<void> {
			const connectChannel = paths.forConnect();
			const killChannel = paths.forKill();

			const instances = new Map<
				string,
				{ unbind: Array<() => void>; dispose(): Promise<void> }
			>();

			const kill = async (id: string) => {
				const entry = instances.get(id);
				if (!entry) return;
				instances.delete(id);
				for (const fn of entry.unbind) fn();
				await entry.dispose();
			};

			ipcMain.handle(connectChannel, async (_event, ...args: unknown[]) => {
				const id = crypto.randomUUID();
				const instance = await factory(...args);
				const innerRuntime = createServerRuntime(
					paths.forLease(id),
					webContents,
					{ onStreamRemoteClose: () => kill(id) },
				);
				const unbind = instance.bind(innerRuntime);
				instances.set(id, {
					unbind,
					dispose: () => instance.dispose(),
				});
				return id;
			});

			ipcMain.handle(killChannel, async (_event, id: string) => {
				await kill(id);
			});

			return async () => {
				await Promise.allSettled([...instances.keys()].map((id) => kill(id)));
				ipcMain.removeHandler(connectChannel);
				ipcMain.removeHandler(killChannel);
			};
		},
	};
}
