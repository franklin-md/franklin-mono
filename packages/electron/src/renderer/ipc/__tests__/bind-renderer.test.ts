import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
			filesystem: {
				readFile: vi.fn(async () => new Uint8Array()),
				writeFile: vi.fn(async () => {}),
				mkdir: vi.fn(async () => {}),
				access: vi.fn(async () => {}),
				stat: vi.fn(async () => ({
					isFile: () => true,
					isDirectory: () => false,
				})),
				readdir: vi.fn(async () => []),
				exists: vi.fn(async () => true),
				glob: vi.fn(async () => []),
				deleteFile: vi.fn(async () => {}),
			},
		};

		(globalThis as { window?: unknown }).window = {
			__franklinBridge: rawBridge,
			__franklinIpcStream: ipcStream,
		};

		const { bindRenderer } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

		const bridge = bindRenderer('franklin', schema, rawBridge);

		const transport = await bridge.spawn();
		await transport.writable.getWriter().write({ type: 'ping' } as never);
		expect(rawBridge.spawn.connect).toHaveBeenCalledTimes(1);
		expect(packets).toContainEqual({
			id: 'franklin:spawn:stream',
			data: {
				id: 'agent-1',
				data: { type: 'ping' },
			},
		});

		await transport.close();
		expect(rawBridge.spawn.kill).toHaveBeenCalledWith('agent-1');
	});
});
