import { describe, expect, it, vi } from 'vitest';
import { method, notification, event, namespace } from '@franklin/lib';
import { bindClient } from '@franklin/lib';
import { JsonRpcProxyRuntime } from '../runtime/client/runtime.js';

const descriptor = namespace({
	add: method<(params: { a: number; b: number }) => Promise<number>>(),
	greet: notification<(params: { msg: string }) => Promise<void>>(),
	events: event<(params: { topic: string }) => AsyncIterable<string>>(),
});

describe('JsonRpcProxyRuntime', () => {
	describe('request methods', () => {
		it('sends a JSON-RPC request with incrementing ids', () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			void proxy.add({ a: 1, b: 2 });
			void proxy.add({ a: 3, b: 4 });

			const calls = send.mock.calls as unknown[][];
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

		it('resolves when response arrives', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			const promise = proxy.add({ a: 1, b: 2 });
			runtime.handleMessage({ jsonrpc: '2.0', id: 0, result: 42 });

			await expect(promise).resolves.toBe(42);
		});
	});

	describe('notification methods', () => {
		it('sends a JSON-RPC notification with no id', () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			void proxy.greet({ msg: 'hi' });

			expect(send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				method: 'greet',
				params: { msg: 'hi' },
			});
		});

		it('resolves immediately', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			await expect(proxy.greet({ msg: 'hi' })).resolves.toBeUndefined();
		});
	});

	describe('event methods', () => {
		it('sends a JSON-RPC request and returns an async iterable', () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			const iterable = proxy.events({ topic: 'test' });

			expect(iterable).toBeDefined();
			expect(Symbol.asyncIterator in iterable).toBe(true);
			expect(send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				id: 0,
				method: 'events',
				params: { topic: 'test' },
			});
		});

		it('receives stream updates and completes', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			const iterable = proxy.events({ topic: 'test' });
			const iterator = iterable[Symbol.asyncIterator]();

			runtime.handleMessage({
				jsonrpc: '2.0',
				method: 'events/update',
				params: { requestId: 0, body: 'chunk1' },
			});
			runtime.handleMessage({
				jsonrpc: '2.0',
				id: 0,
				result: null,
			});

			const first = await iterator.next();
			expect(first.value).toBe('chunk1');

			const done = await iterator.next();
			expect(done.done).toBe(true);
		});

		it('sends cancel notification when iterator.return() is called', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcProxyRuntime(send);
			const proxy = bindClient(descriptor, runtime);

			const iterable = proxy.events({ topic: 'test' });
			const iterator = iterable[Symbol.asyncIterator]();
			await iterator.return?.();

			const calls = send.mock.calls as Array<
				[{ method: string; params: unknown }]
			>;
			const cancelCall = calls.find((c) => c[0].method === '$/stream/cancel');
			expect(cancelCall).toBeDefined();
			expect(cancelCall![0].params).toEqual({ requestId: 0 });
		});
	});

	describe('handleMessage', () => {
		it('returns false for unmatched messages', () => {
			const runtime = new JsonRpcProxyRuntime(vi.fn());
			bindClient(descriptor, runtime);

			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				method: 'unknown',
				params: {},
			});
			expect(handled).toBe(false);
		});
	});

	describe('close', () => {
		it('rejects pending requests', async () => {
			const runtime = new JsonRpcProxyRuntime(vi.fn());
			const proxy = bindClient(descriptor, runtime);

			const promise = proxy.add({ a: 1, b: 2 });
			runtime.close();

			await expect(promise).rejects.toThrow('Connection closed');
		});
	});
});
