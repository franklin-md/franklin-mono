import { describe, expect, it, vi } from 'vitest';
import type { ClientBindingState } from '../runtime/types.js';
import { createRemoteProxy } from '../runtime/client/proxy.js';

function createClientState(
	overrides?: Partial<ClientBindingState>,
): ClientBindingState {
	return {
		send: vi.fn(),
		pendingRequests: new Map(),
		pendingStreams: new Map(),
		...overrides,
	};
}

interface TestRemote {
	add(params: { a: number; b: number }): Promise<number>;
	greet(params: { msg: string }): Promise<void>;
	events(params: { topic: string }): AsyncIterable<string>;
}

const remoteManifest = {
	add: { kind: 'request' as const },
	greet: { kind: 'notification' as const },
	events: { kind: 'event' as const },
};

describe('createRemoteProxy', () => {
	describe('request methods', () => {
		it('sends a JSON-RPC request with incrementing ids', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			void proxy.add({ a: 1, b: 2 });
			void proxy.add({ a: 3, b: 4 });

			const calls = (state.send as ReturnType<typeof vi.fn>).mock
				.calls as unknown[][];
			expect(calls[0]![0]).toMatchObject({
				jsonrpc: '2.0',
				id: 0,
				method: 'add',
				params: { a: 1, b: 2 },
			});
			expect(calls[1]![0]).toMatchObject({
				jsonrpc: '2.0',
				id: 1,
				method: 'add',
				params: { a: 3, b: 4 },
			});
		});

		it('tracks pending requests', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			void proxy.add({ a: 1, b: 2 });

			expect(state.pendingRequests.has(0)).toBe(true);
		});

		it('resolves when pending request is resolved', async () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			const promise = proxy.add({ a: 1, b: 2 });
			state.pendingRequests.get(0)?.resolve(42);

			await expect(promise).resolves.toBe(42);
		});
	});

	describe('notification methods', () => {
		it('sends a JSON-RPC notification with no id', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			void proxy.greet({ msg: 'hi' });

			expect(state.send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				method: 'greet',
				params: { msg: 'hi' },
			});
		});

		it('resolves immediately', async () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			await expect(proxy.greet({ msg: 'hi' })).resolves.toBeUndefined();
		});

		it('does not track pending requests', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			void proxy.greet({ msg: 'hi' });

			expect(state.pendingRequests.size).toBe(0);
		});
	});

	describe('event methods', () => {
		it('sends a JSON-RPC request and returns an async iterable', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			const iterable = proxy.events({ topic: 'test' });

			expect(iterable).toBeDefined();
			expect(Symbol.asyncIterator in iterable).toBe(true);
			expect(state.send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				id: 0,
				method: 'events',
				params: { topic: 'test' },
			});
		});

		it('tracks the stream in pendingStreams', () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			proxy.events({ topic: 'test' });

			expect(state.pendingStreams.has(0)).toBe(true);
		});

		it('sends cancel notification when iterator.return() is called', async () => {
			const state = createClientState();
			const proxy = createRemoteProxy<TestRemote>(state, remoteManifest);

			const iterable = proxy.events({ topic: 'test' });
			const iterator = iterable[Symbol.asyncIterator]();
			await iterator.return?.();

			const calls = (state.send as ReturnType<typeof vi.fn>).mock
				.calls as Array<[{ method: string; params: unknown }]>;
			const cancelCall = calls.find((c) => c[0].method === '$/stream/cancel');
			expect(cancelCall).toBeDefined();
			expect(cancelCall![0].params).toEqual({ requestId: 0 });
			expect(state.pendingStreams.has(0)).toBe(false);
		});
	});
});
