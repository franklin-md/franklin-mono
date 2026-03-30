import type { WebContents } from 'electron';
import type { Filesystem } from '@franklin/lib';
import type { ClientProtocol } from '@franklin/mini-acp';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handleMap = new Map<string, (...args: any[]) => any>();
const listenerMap = new Map<string, Set<(...args: any[]) => void>>();

vi.mock('electron', () => ({
	ipcMain: {
		handle: (channel: string, handler: (...args: any[]) => any) => {
			handleMap.set(channel, handler);
		},
		removeHandler: (channel: string) => {
			handleMap.delete(channel);
		},
		on: (channel: string, handler: (...args: any[]) => void) => {
			const listeners = listenerMap.get(channel) ?? new Set();
			listeners.add(handler);
			listenerMap.set(channel, listeners);
		},
		removeListener: (channel: string, handler: (...args: any[]) => void) => {
			listenerMap.get(channel)?.delete(handler);
		},
	},
}));

const noop = async () => {};

function createEnvironment(label: string) {
	return Object.assign(
		{
			filesystem: createFilesystem(label),
			config: async () => ({
				cwd: '/tmp',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			}),
			reconfigure: noop,
		},
		{ dispose: noop },
	);
}

function createFilesystem(label: string): Filesystem {
	return {
		readFile: async () => new Uint8Array([label.length]),
		writeFile: async () => {},
		mkdir: async () => {},
		access: async () => {},
		stat: async () => ({
			isFile: label === 'a',
			isDirectory: label !== 'a',
		}),
		readdir: async () => [],
		exists: async () => label === 'a',
		glob: async () => [],
		deleteFile: async () => {},
	};
}

function createTransportSpy(): {
	close: ReturnType<typeof vi.fn>;
	transport: ClientProtocol & { dispose(): Promise<void> };
} {
	const close = vi.fn(async () => {});
	return {
		close,
		transport: {
			readable: new ReadableStream(),
			writable: new WritableStream(),
			close,
			dispose: close,
		} as unknown as ClientProtocol & { dispose(): Promise<void> },
	};
}

function createWebContents(id: number): WebContents {
	return {
		id,
		send: vi.fn(),
	} as unknown as WebContents;
}

function emit(channel: string, packet: unknown, senderId = 1) {
	for (const listener of listenerMap.get(channel) ?? []) {
		listener({ sender: { id: senderId } }, packet);
	}
}

function invoke(channel: string, ...args: unknown[]) {
	const handler = handleMap.get(channel);
	if (!handler) {
		throw new Error(`No handler registered for ${channel}`);
	}
	return handler({ sender: { id: 1 } }, ...args);
}

describe('bindMain', () => {
	beforeEach(() => {
		handleMap.clear();
		listenerMap.clear();
		vi.resetModules();
	});

	afterEach(() => {
		handleMap.clear();
		listenerMap.clear();
	});

	it('dispatches invoke handlers for a bound window', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');
		const { createChannels } = await import('../../../shared/channels.js');

		const handle = bindMain(
			'franklin',
			schema,
			{
				spawn: async () => createTransportSpy().transport,
				environment: async () => createEnvironment('b'),
				filesystem: createFilesystem('a'),
				ai: {
					getOAuthProviders: async () => [],
					getApiKeyProviders: async () => [],
				},
			},
			createWebContents(1),
		);

		const channel = createChannels('franklin').getMethodChannel([
			'filesystem',
			'exists',
		]);
		await expect(invoke(channel, '/test')).resolves.toBe(true);

		await handle.dispose();
	});

	it('dispatches handle-backed method calls for leased objects', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');
		const { createChannels } = await import('../../../shared/channels.js');

		const handle = bindMain(
			'franklin',
			schema,
			{
				spawn: async () => createTransportSpy().transport,
				environment: async () => createEnvironment('b'),
				filesystem: createFilesystem('a'),
				ai: {
					getOAuthProviders: async () => [],
					getApiKeyProviders: async () => [],
				},
			},
			createWebContents(1),
		);

		const channels = createChannels('franklin');
		const id = await invoke(channels.getLeaseConnectChannel(['environment']));
		const exists = channels.getLeaseMethodChannel(
			['environment'],
			['filesystem', 'exists'],
		);

		await expect(invoke(exists, id, '/test')).resolves.toBe(false);
		await invoke(channels.getLeaseKillChannel(['environment']), id);

		await handle.dispose();
	});

	it('binds direct stream descriptors to per-path IPC channels', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { createChannels } = await import('../../../shared/channels.js');
		const { namespace, stream } = await import('@franklin/lib/proxy');

		let emitLocal: (chunk: unknown) => void = (_chunk: unknown) => {
			throw new Error('stream not initialized');
		};
		let closeLocal = () => {};
		const written: unknown[] = [];
		const close = vi.fn(async () => {
			try {
				closeLocal();
			} catch {
				// The stream may already be closed during disposal races.
			}
		});
		const webContents = createWebContents(1);

		const handle = bindMain(
			'franklin',
			namespace({
				logs: stream(),
			}),
			{
				logs: () =>
					({
						readable: new ReadableStream({
							start(nextController) {
								emitLocal = (chunk: unknown) => {
									nextController.enqueue(chunk as never);
								};
								closeLocal = () => {
									nextController.close();
								};
							},
						}),
						writable: new WritableStream({
							write(chunk) {
								written.push(chunk);
							},
						}),
						close,
					}) as ClientProtocol,
			} as never,
			webContents,
		);

		const channel = createChannels('franklin').getStreamChannel(['logs']);
		emit(channel, { kind: 'data', data: { type: 'ping' } });
		await Promise.resolve();
		await Promise.resolve();
		expect(written).toContainEqual({ type: 'ping' });

		emitLocal({ type: 'pong' } as never);
		await Promise.resolve();
		await Promise.resolve();
		expect(webContents.send).toHaveBeenCalledWith(channel, {
			kind: 'data',
			data: { type: 'pong' },
		});

		emit(channel, { kind: 'close' });
		await vi.waitFor(() => {
			expect(close).toHaveBeenCalledTimes(1);
		});

		await handle.dispose();
	});

	it('closes active transports when the renderer kills them', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');
		const { createChannels } = await import('../../../shared/channels.js');

		const transportSpy = createTransportSpy();
		const handle = bindMain(
			'franklin',
			schema,
			{
				spawn: async () => transportSpy.transport,
				environment: async () => createEnvironment('b'),
				filesystem: createFilesystem('a'),
				ai: {
					getOAuthProviders: async () => [],
					getApiKeyProviders: async () => [],
				},
			},
			createWebContents(1),
		);

		const channels = createChannels('franklin');
		const connectChannel = channels.getLeaseConnectChannel(['spawn']);
		const killChannel = channels.getLeaseKillChannel(['spawn']);
		const id = await invoke(connectChannel);

		await invoke(killChannel, id);

		expect(transportSpy.close).toHaveBeenCalledTimes(1);

		await handle.dispose();
	});
});
