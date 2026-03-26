import type { Platform } from '@franklin/agent/browser';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FranklinPreloadBridge } from '../../../shared/schema.js';

describe('bindRenderer', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		delete (globalThis as { window?: unknown }).window;
	});

	it('hydrates transport leaves into renderer-side duplexes', async () => {
		const packets: unknown[] = [];
		const listeners = new Set<(packet: unknown) => void>();

		const ipcStream = {
			on: (callback: (packet: unknown) => void) => {
				listeners.add(callback);
				return () => {
					listeners.delete(callback);
				};
			},
			invoke: (packet: unknown) => {
				packets.push(packet);
			},
		};

		const rawBridge = {
			spawn: {
				connect: vi.fn(async () => 'agent-1'),
				kill: vi.fn(async () => {}),
			},
			environment: {
				connect: vi.fn(async () => 'env-1'),
				kill: vi.fn(async () => {}),
				proxy: {
					filesystem: {
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
			__franklinIpcStream: ipcStream,
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
		expect(packets).toContainEqual({
			id: 'franklin:spawn:stream:agent-1',
			data: { type: 'ping' },
		});

		expect(typeof transport.dispose).toBe('function');
		await transport.close();
		expect(rawBridge.spawn.kill).toHaveBeenCalledWith('agent-1');

		const environment = await bridge.environment();
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
});
