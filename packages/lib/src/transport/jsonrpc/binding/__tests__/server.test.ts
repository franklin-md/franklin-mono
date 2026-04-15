import { describe, expect, it, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	bindServer,
} from '@franklin/lib';
import { JsonRpcServerRuntime } from '../runtime/server/runtime.js';

const descriptor = namespace({
	add: method<(params: { a: number; b: number }) => Promise<number>>(),
	notify: notification<(params: { msg: string }) => Promise<void>>(),
	events: event<(params: { topic: string }) => AsyncIterable<string>>(),
});

function createHandlers() {
	return {
		add: vi.fn(async ({ a, b }: { a: number; b: number }) => a + b),
		notify: vi.fn(async () => {}),
		events: vi.fn(async function* () {
			yield 'a';
			yield 'b';
		}),
	};
}

describe('JsonRpcServerRuntime', () => {
	it('returns handleMessage and close', () => {
		const runtime = new JsonRpcServerRuntime(vi.fn(), vi.fn());
		bindServer(descriptor, createHandlers(), runtime);
		expect(typeof runtime.handleMessage).toBe('function');
		expect(typeof runtime.close).toBe('function');
	});

	describe('handleMessage', () => {
		it('dispatches request messages to handlers', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcServerRuntime(send, vi.fn());
			bindServer(descriptor, createHandlers(), runtime);

			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				id: 1,
				method: 'add',
				params: { a: 2, b: 3 },
			});

			expect(handled).toBe(true);
			await vi.waitFor(() =>
				expect(send).toHaveBeenCalledWith({
					jsonrpc: '2.0',
					id: 1,
					result: 5,
				}),
			);
		});

		it('dispatches notification messages to handlers', async () => {
			const handlers = createHandlers();
			const runtime = new JsonRpcServerRuntime(vi.fn(), vi.fn());
			bindServer(descriptor, handlers, runtime);

			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				method: 'notify',
				params: { msg: 'hi' },
			});

			expect(handled).toBe(true);
			await vi.waitFor(() =>
				expect(handlers.notify).toHaveBeenCalledWith({ msg: 'hi' }),
			);
		});

		it('dispatches stream requests and sends updates', async () => {
			const send = vi.fn();
			const runtime = new JsonRpcServerRuntime(send, vi.fn());
			bindServer(descriptor, createHandlers(), runtime);

			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				id: 5,
				method: 'events',
				params: { topic: 'test' },
			});

			expect(handled).toBe(true);
			await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));

			const calls = send.mock.calls as unknown[][];
			expect(calls[0]![0]).toMatchObject({
				method: 'events/update',
				params: { requestId: 5, body: 'a' },
			});
			expect(calls[1]![0]).toMatchObject({
				method: 'events/update',
				params: { requestId: 5, body: 'b' },
			});
			expect(calls[2]![0]).toMatchObject({
				jsonrpc: '2.0',
				id: 5,
				result: null,
			});
		});

		it('handles stream cancel notifications', () => {
			const runtime = new JsonRpcServerRuntime(vi.fn(), vi.fn());
			bindServer(
				descriptor,
				{
					...createHandlers(),
					events: async function* () {
						yield 'start';
						await new Promise(() => {}); // block forever
					},
				},
				runtime,
			);

			// Start a stream
			runtime.handleMessage({
				jsonrpc: '2.0',
				id: 10,
				method: 'events',
				params: { topic: 'test' },
			});

			// Cancel it
			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				method: '$/stream/cancel',
				params: { requestId: 10 },
			});
			expect(handled).toBe(true);
		});

		it('returns false for unmatched messages', () => {
			const runtime = new JsonRpcServerRuntime(vi.fn(), vi.fn());
			bindServer(descriptor, createHandlers(), runtime);

			const handled = runtime.handleMessage({
				jsonrpc: '2.0',
				id: 1,
				result: 42,
			});
			expect(handled).toBe(false);
		});
	});

	describe('close', () => {
		it('tears down active streams', async () => {
			let resolve!: () => void;
			const blocked = new Promise<void>((r) => {
				resolve = r;
			});

			const runtime = new JsonRpcServerRuntime(vi.fn(), vi.fn());
			bindServer(
				descriptor,
				{
					...createHandlers(),
					events: async function* () {
						yield 'first';
						await blocked;
					},
				},
				runtime,
			);

			runtime.handleMessage({
				jsonrpc: '2.0',
				id: 1,
				method: 'events',
				params: { topic: 'test' },
			});

			await vi.waitFor(() => {});
			runtime.close();
			resolve();
		});
	});
});
