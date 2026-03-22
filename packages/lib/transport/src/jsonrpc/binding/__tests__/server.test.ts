import { describe, expect, it, vi } from 'vitest';
import { createServerBinding } from '../runtime/server/server.js';

interface ServerApi {
	add(params: { a: number; b: number }): Promise<number>;
	notify(params: { msg: string }): Promise<void>;
	events(params: { topic: string }): AsyncIterable<string>;
}

const manifest = {
	add: { kind: 'request' as const },
	notify: { kind: 'notification' as const },
	events: { kind: 'event' as const },
};

function createHandlers(overrides?: Partial<ServerApi>): ServerApi {
	return {
		add: vi.fn(async ({ a, b }: { a: number; b: number }) => a + b),
		notify: vi.fn(async () => {}),
		events: vi.fn(async function* () {
			yield 'a';
			yield 'b';
		}),
		...overrides,
	};
}

describe('createServerBinding', () => {
	it('returns an object with handleMessage and close', () => {
		const binding = createServerBinding({
			manifest,
			handlers: createHandlers(),
			send: vi.fn(),
			onError: vi.fn(),
		});
		expect(typeof binding.handleMessage).toBe('function');
		expect(typeof binding.close).toBe('function');
	});

	describe('handleMessage', () => {
		it('dispatches request messages to handlers', async () => {
			const send = vi.fn();
			const handlers = createHandlers();
			const binding = createServerBinding({
				manifest,
				handlers,
				send,
				onError: vi.fn(),
			});

			const handled = binding.handleMessage({
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
			const binding = createServerBinding({
				manifest,
				handlers,
				send: vi.fn(),
				onError: vi.fn(),
			});

			const handled = binding.handleMessage({
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
			const binding = createServerBinding({
				manifest,
				handlers: createHandlers(),
				send,
				onError: vi.fn(),
			});

			const handled = binding.handleMessage({
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
			const binding = createServerBinding({
				manifest,
				handlers: createHandlers({
					events: async function* () {
						yield 'start'; // eslint requires at least one yield
						await new Promise(() => {}); // Block forever
					},
				}),
				send: vi.fn(),
				onError: vi.fn(),
			});

			// Start a stream to populate activeStreams
			binding.handleMessage({
				jsonrpc: '2.0',
				id: 10,
				method: 'events',
				params: { topic: 'test' },
			});

			// Cancel it — internal activeStreams should have the iterator
			const handled = binding.handleMessage({
				jsonrpc: '2.0',
				method: '$/stream/cancel',
				params: { requestId: 10 },
			});
			expect(handled).toBe(true);
		});

		it('returns false for unmatched messages', () => {
			const binding = createServerBinding({
				manifest,
				handlers: createHandlers(),
				send: vi.fn(),
				onError: vi.fn(),
			});

			const handled = binding.handleMessage({
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

			const binding = createServerBinding({
				manifest,
				handlers: createHandlers({
					events: async function* () {
						yield 'first';
						await blocked; // hang until closed
					},
				}),
				send: vi.fn(),
				onError: vi.fn(),
			});

			binding.handleMessage({
				jsonrpc: '2.0',
				id: 1,
				method: 'events',
				params: { topic: 'test' },
			});

			// Let the first yield process
			await vi.waitFor(() => {});

			binding.close();
			resolve(); // unblock so the test can complete
		});
	});
});
