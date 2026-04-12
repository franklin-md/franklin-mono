import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FranklinIpcRuntime } from '../../../shared/api.js';

/**
 * Creates a mock FranklinIpcRuntime backed by a handler map.
 *
 * Tests register invoke handlers via `handlers.set(channel, fn)`.
 * Sent packets are collected in `sentPackets`, and `pushToSubscriber`
 * simulates main-to-renderer messages.
 */
function createMockIpc(): {
	ipc: FranklinIpcRuntime;
	handlers: Map<string, (...args: unknown[]) => unknown>;
	sentPackets: Map<string, unknown[]>;
	pushToSubscriber: (channel: string, packet: unknown) => void;
} {
	const handlers = new Map<string, (...args: unknown[]) => unknown>();
	const sentPackets = new Map<string, unknown[]>();
	const subscribers = new Map<string, Set<(packet: unknown) => void>>();

	const ipc: FranklinIpcRuntime = {
		invoke(channel: string, ...args: unknown[]): Promise<unknown> {
			const handler = handlers.get(channel);
			if (!handler) {
				return Promise.reject(
					new Error(`No mock handler for channel: ${channel}`),
				);
			}
			return Promise.resolve(handler(...args));
		},
		send(channel: string, packet: unknown) {
			const packets = sentPackets.get(channel) ?? [];
			packets.push(packet);
			sentPackets.set(channel, packets);
		},
		subscribe(channel: string, listener: (packet: unknown) => void) {
			const listeners = subscribers.get(channel) ?? new Set();
			listeners.add(listener);
			subscribers.set(channel, listeners);
			return () => {
				listeners.delete(listener);
			};
		},
	};

	return {
		ipc,
		handlers,
		sentPackets,
		pushToSubscriber(channel: string, packet: unknown) {
			for (const listener of subscribers.get(channel) ?? []) {
				listener(packet);
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

	it('invokes methods at the correct channels', async () => {
		const { ipc, handlers } = createMockIpc();
		handlers.set('filesystem:exists', () => true);

		const { bindRenderer } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

		const platform = bindRenderer(schema, ipc) as {
			filesystem: { exists: (path: string) => Promise<boolean> };
		};

		await expect(platform.filesystem.exists('/test')).resolves.toBe(true);
	});

	it('connects and dispatches resource methods at id-scoped channels', async () => {
		const { ipc, handlers } = createMockIpc();

		handlers.set('environment:connect', () => 'env-1');
		handlers.set('environment:kill', () => undefined);
		handlers.set('environment:lease:env-1:filesystem:exists', () => true);

		const { bindRenderer } = await import('../bind/index.js');
		const { schema } = await import('../../../shared/schema.js');

		const platform = bindRenderer(schema, ipc) as {
			environment: (...args: unknown[]) => Promise<{
				filesystem: { exists: (p: string) => Promise<boolean> };
				dispose: () => Promise<void>;
			}>;
		};

		const env = await platform.environment({
			fsConfig: {
				cwd: '/tmp',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		});

		await expect(env.filesystem.exists('/tmp')).resolves.toBe(true);
		await env.dispose();
	});

	it('creates duplex streams over IPC for resource(stream)', async () => {
		const { ipc, handlers, sentPackets, pushToSubscriber } = createMockIpc();
		handlers.set('spawn:connect', () => 'agent-1');
		handlers.set('spawn:kill', () => undefined);

		const { bindRenderer } = await import('../bind/index.js');
		const { namespace, resource, stream } = await import('@franklin/lib/proxy');

		const testSchema = namespace({
			spawn: resource(stream()),
		});

		const platform = bindRenderer(testSchema, ipc) as {
			spawn: () => Promise<{
				readable: ReadableStream;
				writable: WritableStream;
				close: () => Promise<void>;
				dispose: () => Promise<void>;
			}>;
		};

		const transport = await platform.spawn();

		// Write to writable → sends IpcStreamMessage on the lease stream channel
		await transport.writable.getWriter().write({ type: 'ping' });
		const streamChannel = 'spawn:lease:agent-1:stream';
		const packets = sentPackets.get(streamChannel) ?? [];
		expect(packets).toContainEqual({ kind: 'data', data: { type: 'ping' } });

		// Push from main → readable receives data
		const reader = transport.readable.getReader();
		pushToSubscriber(streamChannel, {
			kind: 'data',
			data: { type: 'pong' },
		});
		await expect(reader.read()).resolves.toEqual({
			value: { type: 'pong' },
			done: false,
		});
		reader.releaseLock();

		// dispose kills the resource
		await transport.dispose();
	});

	it('creates duplex streams over IPC for direct stream descriptors', async () => {
		const { ipc, sentPackets, pushToSubscriber } = createMockIpc();

		const { bindRenderer } = await import('../bind/index.js');
		const { namespace, stream } = await import('@franklin/lib/proxy');

		const testSchema = namespace({
			logs: stream<{ type: string }>(),
		});

		const platform = bindRenderer(testSchema, ipc) as {
			logs: {
				readable: ReadableStream<{ type: string }>;
				writable: WritableStream<{ type: string }>;
				close: () => Promise<void>;
			};
		};

		// Write → sends IpcStreamMessage
		await platform.logs.writable.getWriter().write({ type: 'ping' });
		const streamChannel = 'logs:stream';
		const packets = sentPackets.get(streamChannel) ?? [];
		expect(packets).toContainEqual({ kind: 'data', data: { type: 'ping' } });

		// Read from main
		const reader = platform.logs.readable.getReader();
		pushToSubscriber(streamChannel, {
			kind: 'data',
			data: { type: 'pong' },
		});
		await expect(reader.read()).resolves.toEqual({
			value: { type: 'pong' },
			done: false,
		});
	});
});
