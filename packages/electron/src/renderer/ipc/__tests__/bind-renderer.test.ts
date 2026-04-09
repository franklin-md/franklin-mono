import type { Platform } from '@franklin/agent/browser';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FranklinPreloadBridge } from '../../../shared/schema.js';
import type {
	IpcStreamObserver,
	PreloadStreamBridge,
} from '../../../shared/api.js';

function createStreamBridge(): {
	close: ReturnType<typeof vi.fn>;
	bridge: PreloadStreamBridge;
	packets: unknown[];
	push: (packet: unknown) => void;
} {
	const observers = new Set<IpcStreamObserver>();
	const packets: unknown[] = [];
	const close = vi.fn(async () => {
		for (const observer of observers) {
			observer.close();
		}
		observers.clear();
	});

	return {
		close,
		packets,
		bridge: {
			subscribe: (observer) => {
				observers.add(observer);
				return () => {
					observers.delete(observer);
				};
			},
			send: (packet: unknown) => {
				packets.push(packet);
			},
			close,
		},
		push: (packet: unknown) => {
			for (const observer of observers) {
				observer.next(packet);
			}
		},
	};
}

describe('bindRenderer', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		delete (globalThis as { window?: unknown }).window;
	});

	it('hydrates transport leaves into renderer-side duplexes', async () => {
		const spawnStream = createStreamBridge();
		const rawBridge = {
			spawn: {
				connect: vi.fn(async () => 'agent-1'),
				kill: vi.fn(async () => {}),
				stream: vi.fn(() => spawnStream.bridge),
			},
			environment: {
				connect: vi.fn(async () => 'env-1'),
				kill: vi.fn(async () => {}),
				proxy: {
					filesystem: {
						resolve: vi.fn(async () => '/tmp'),
						exists: vi.fn(async (_id: string, _path: string) => true),
						readFile: vi.fn(async () => new Uint8Array()),
						writeFile: vi.fn(async () => {}),
						mkdir: vi.fn(async () => {}),
						access: vi.fn(async () => {}),
						stat: vi.fn(async () => ({
							isFile: true,
							isDirectory: false,
						})),
						readdir: vi.fn(async () => []),
						glob: vi.fn(async () => []),
						deleteFile: vi.fn(async () => {}),
					},
					terminal: {
						exec: vi.fn(async () => ({
							exit_code: 0,
							stdout: '',
							stderr: '',
						})),
					},
					web: {
						fetch: vi.fn(async () => ({
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
						})),
					},
					config: vi.fn(async () => ({
						fsConfig: {
							cwd: '/tmp',
							permissions: { allowRead: ['**'], allowWrite: ['**'] },
						},
						netConfig: { allowedDomains: [], deniedDomains: [] },
					})),
					reconfigure: vi.fn(async () => {}),
				},
			},
			ai: {
				getOAuthProviders: vi.fn(async () => []),
				getApiKeyProviders: vi.fn(async () => []),
				getProvider: {
					connect: vi.fn(async () => 'provider-1'),
					kill: vi.fn(async () => {}),
					proxy: {
						login: vi.fn(async (_id: string) => ({}) as any),
					},
				},
			},
			filesystem: {
				readFile: vi.fn(async () => new Uint8Array()),
				writeFile: vi.fn(async () => {}),
				mkdir: vi.fn(async () => {}),
				access: vi.fn(async () => {}),
				stat: vi.fn(async () => ({
					isFile: true,
					isDirectory: false,
				})),
				readdir: vi.fn(async () => []),
				exists: vi.fn(async () => true),
				glob: vi.fn(async () => []),
				deleteFile: vi.fn(async () => {}),
			},
		} as unknown as FranklinPreloadBridge;

		(globalThis as { window?: unknown }).window = {
			__franklinBridge: rawBridge,
		};

		const { bindRenderer } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

		const bridge = bindRenderer(
			'franklin',
			schema,
			rawBridge,
		) as unknown as Platform;

		const transport = await bridge.spawn();
		await transport.writable.getWriter().write({ type: 'ping' } as never);
		expect(rawBridge.spawn.connect).toHaveBeenCalledTimes(1);
		expect(rawBridge.spawn.stream).toHaveBeenCalledWith('agent-1');
		expect(spawnStream.packets).toContainEqual({ type: 'ping' });

		expect(typeof transport.dispose).toBe('function');
		await transport.close();
		expect(spawnStream.close).toHaveBeenCalledTimes(1);
		expect(rawBridge.spawn.kill).toHaveBeenCalledWith('agent-1');

		const environment = await bridge.environment({
			fsConfig: {
				cwd: '/tmp',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		});
		await expect(environment.filesystem.exists('/tmp')).resolves.toBe(true);
		expect(rawBridge.environment.connect).toHaveBeenCalledTimes(1);
		const filesystemProxy = rawBridge.environment.proxy as unknown as {
			filesystem: {
				exists: ReturnType<typeof vi.fn>;
			};
		};
		expect(filesystemProxy.filesystem.exists).toHaveBeenCalledWith(
			'env-1',
			'/tmp',
		);

		expect(typeof environment.dispose).toBe('function');
		await environment.dispose();
		expect(rawBridge.environment.kill).toHaveBeenCalledWith('env-1');
	});

	it('hydrates direct stream descriptors into renderer-side duplexes', async () => {
		const directStream = createStreamBridge();
		const rawBridge = {
			logs: directStream.bridge,
		};

		(globalThis as { window?: unknown }).window = {
			__franklinBridge: rawBridge,
		};

		const { bindRenderer } = await import('../bind/index.js');
		const { namespace, stream } = await import('@franklin/lib/proxy');
		const directSchema = namespace({
			logs: stream<{ type: string }>(),
		});

		const bridge = bindRenderer(
			'franklin',
			directSchema,
			rawBridge as never,
		) as {
			logs: {
				readable: ReadableStream<{ type: string }>;
				writable: WritableStream<{ type: string }>;
				close: () => Promise<void>;
			};
		};

		await bridge.logs.writable.getWriter().write({ type: 'ping' });
		expect(directStream.packets).toContainEqual({ type: 'ping' });

		const reader = bridge.logs.readable.getReader();
		directStream.push({ type: 'pong' });
		await expect(reader.read()).resolves.toEqual({
			value: { type: 'pong' },
			done: false,
		});

		await bridge.logs.close();
		expect(directStream.close).toHaveBeenCalledTimes(1);
	});
});
