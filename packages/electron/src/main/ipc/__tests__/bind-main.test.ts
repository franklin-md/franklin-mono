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
			terminal: {
				exec: async () => ({ exit_code: 0, stdout: '', stderr: '' }),
			},
			web: {
				fetch: async () => ({
					requestedUrl: 'https://example.com',
					finalUrl: 'https://example.com',
					status: 200,
					statusText: 'OK',
					contentType: 'text/plain',
					kind: 'text',
					text: '',
					truncated: false,
					isError: false,
					cacheable: true,
				}),
			},
			config: async () => ({
				fsConfig: {
					cwd: '/tmp',
					permissions: { allowRead: ['**'], allowWrite: ['**'] },
				},
				netConfig: { allowedDomains: [], deniedDomains: [] },
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
		resolve: async (...paths: string[]) => paths[paths.length - 1]!,
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

function createAuth() {
	return {
		load: async () => ({}),
		getApiKey: async () => undefined,
		setApiKeyEntry: async () => {},
		removeApiKeyEntry: async () => {},
		removeOAuthEntry: async () => {},
		openExternal: async () => {},
		onAuthChange: () => () => {},
		flow: async () => ({
			onAuth: () => () => {},
			onProgress: () => () => {},
			onPrompt: () => () => {},
			respond: async () => {},
			login: async () => {},
			dispose: async () => {},
		}),
		getOAuthProviders: async () => [],
		getApiKeyProviders: async () => [],
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
				auth: createAuth(),
			},
			createWebContents(1),
		);

		// Cursor-based channels: prefix:namespace:namespace
		const channel = 'franklin:filesystem:exists';
		await expect(invoke(channel, '/test')).resolves.toBe(true);

		await handle.dispose();
	}, 15_000);

	it('binds on descriptors to subscribe and unsubscribe channels', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { namespace, on } = await import('@franklin/lib/proxy');

		const unsubscribe = vi.fn();
		const webContents = createWebContents(1);
		const handle = bindMain(
			'franklin',
			namespace({
				status: on<string>(),
			}),
			{
				status: (callback: (value: string) => void) => {
					callback('ready');
					return unsubscribe;
				},
			} as never,
			webContents,
		);

		emit('franklin:status:on:subscribe', 'sub-1');
		expect(webContents.send).toHaveBeenCalledWith(
			'franklin:status:on:sub-1',
			'ready',
		);

		emit('franklin:status:on:unsubscribe', 'sub-1');
		expect(unsubscribe).toHaveBeenCalledTimes(1);

		await handle.dispose();
	});

	it('dispatches handle-backed method calls for leased objects', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

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
				auth: createAuth(),
			},
			createWebContents(1),
		);

		// Resource connect/kill channels
		const connectChannel = 'franklin:environment:connect';
		const killChannel = 'franklin:environment:kill';

		const id = await invoke(connectChannel);

		// Resource inner methods are now at prefix:lease:{id}:namespace
		const existsChannel = `franklin:environment:lease:${id}:filesystem:exists`;
		await expect(invoke(existsChannel, '/test')).resolves.toBe(false);

		await invoke(killChannel, id);
		await handle.dispose();
	});

	it('preserves this-binding for class-based leased resource methods', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

		class StatefulFilesystem {
			private label: string;
			constructor(label: string) {
				this.label = label;
			}
			async exists() {
				return this.label === 'a';
			}
			async readFile() {
				return new Uint8Array([this.label.length]);
			}
			async writeFile() {}
			async mkdir() {}
			async access() {}
			async stat() {
				return {
					isFile: this.label === 'a',
					isDirectory: this.label !== 'a',
				};
			}
			async readdir() {
				return [];
			}
			async glob() {
				return [];
			}
			async deleteFile() {}
			async resolve(...paths: string[]) {
				return paths[paths.length - 1]!;
			}
		}

		const handle = bindMain(
			'franklin',
			schema,
			{
				spawn: async () => createTransportSpy().transport,
				environment: async () => {
					const fs = new StatefulFilesystem('a');
					return Object.assign(
						{
							filesystem: fs,
							terminal: {
								exec: async () => ({ exit_code: 0, stdout: '', stderr: '' }),
							},
							web: {
								fetch: async () => ({
									requestedUrl: 'https://example.com',
									finalUrl: 'https://example.com',
									status: 200,
									statusText: 'OK',
									contentType: 'text/plain',
									kind: 'text',
									text: '',
									truncated: false,
									isError: false,
									cacheable: true,
								}),
							},
							config: async () => ({
								fsConfig: {
									cwd: '/tmp',
									permissions: { allowRead: ['**'], allowWrite: ['**'] },
								},
								netConfig: { allowedDomains: [], deniedDomains: [] },
							}),
							reconfigure: noop,
						},
						{ dispose: noop },
					);
				},
				filesystem: createFilesystem('a'),
				ai: {
					getOAuthProviders: async () => [],
					getApiKeyProviders: async () => [],
				},
				auth: createAuth(),
			},
			createWebContents(1),
		);

		const connectChannel = 'franklin:environment:connect';
		const killChannel = 'franklin:environment:kill';

		const id = await invoke(connectChannel);
		const existsChannel = `franklin:environment:lease:${id}:filesystem:exists`;

		await expect(invoke(existsChannel, '/test')).resolves.toBe(true);
		await invoke(killChannel, id);

		await handle.dispose();
	});

	it('binds direct stream descriptors to per-path IPC channels', async () => {
		const { bindMain } = await import('../bind/index.js');
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
				logs: {
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
				} as ClientProtocol,
			} as never,
			webContents,
		);

		// Stream channel: prefix:namespace:stream
		const channel = 'franklin:logs:stream';
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

	it('binds resource stream instances to per-lease IPC channels', async () => {
		const { bindMain } = await import('../bind/index.js');
		const { namespace, resource, stream } = await import('@franklin/lib/proxy');

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
				spawn: resource(stream()),
			}),
			{
				spawn: async () =>
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

		// Resource connect channel
		const connectChannel = 'franklin:spawn:connect';
		const id = await invoke(connectChannel);

		// Per-lease stream channel: prefix:lease:{id}:stream
		const channel = `franklin:spawn:lease:${id}:stream`;

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
				auth: createAuth(),
			},
			createWebContents(1),
		);

		const connectChannel = 'franklin:spawn:connect';
		const killChannel = 'franklin:spawn:kill';

		const id = await invoke(connectChannel);
		await invoke(killChannel, id);

		expect(transportSpy.close).toHaveBeenCalledTimes(1);

		await handle.dispose();
	});
});
