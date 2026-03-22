import { describe, expect, it, vi } from 'vitest';
import { createClientBinding } from '../runtime/client/client.js';

interface RemoteApi {
	add(params: { a: number; b: number }): Promise<number>;
	greet(params: { msg: string }): Promise<void>;
	events(params: { topic: string }): AsyncIterable<string>;
}

const manifest = {
	add: { kind: 'request' as const },
	greet: { kind: 'notification' as const },
	events: { kind: 'event' as const },
};

describe('createClientBinding', () => {
	it('returns an object with remote, handleMessage, and close', () => {
		const binding = createClientBinding<RemoteApi>({
			manifest,
			send: vi.fn(),
		});
		expect(binding.remote).toBeDefined();
		expect(typeof binding.handleMessage).toBe('function');
		expect(typeof binding.close).toBe('function');
	});

	describe('remote proxy', () => {
		it('sends request via proxy', () => {
			const send = vi.fn();
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send,
			});

			void binding.remote.add({ a: 1, b: 2 });

			expect(send).toHaveBeenCalledWith(
				expect.objectContaining({
					jsonrpc: '2.0',
					method: 'add',
					params: { a: 1, b: 2 },
				}),
			);
		});

		it('sends notification via proxy', () => {
			const send = vi.fn();
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send,
			});

			void binding.remote.greet({ msg: 'hi' });

			expect(send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				method: 'greet',
				params: { msg: 'hi' },
			});
		});

		it('creates stream via proxy', () => {
			const send = vi.fn();
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send,
			});

			const iterable = binding.remote.events({ topic: 'test' });
			expect(Symbol.asyncIterator in iterable).toBe(true);
		});
	});

	describe('handleMessage', () => {
		it('resolves pending request on success response', async () => {
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send: vi.fn(),
			});

			const promise = binding.remote.add({ a: 1, b: 2 });

			binding.handleMessage({
				jsonrpc: '2.0',
				id: 0,
				result: 3,
			});

			await expect(promise).resolves.toBe(3);
		});

		it('pushes stream updates to pending stream', async () => {
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send: vi.fn(),
			});

			const iterable = binding.remote.events({ topic: 'test' });
			const iterator = iterable[Symbol.asyncIterator]();

			// Push an update
			binding.handleMessage({
				jsonrpc: '2.0',
				method: 'events/update',
				params: { requestId: 0, body: 'chunk1' },
			});

			// Complete the stream
			binding.handleMessage({
				jsonrpc: '2.0',
				id: 0,
				result: null,
			});

			const first = await iterator.next();
			expect(first.value).toBe('chunk1');

			const done = await iterator.next();
			expect(done.done).toBe(true);
		});

		it('returns false for unmatched messages', () => {
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send: vi.fn(),
			});

			const handled = binding.handleMessage({
				jsonrpc: '2.0',
				method: 'unknown',
				params: {},
			});
			expect(handled).toBe(false);
		});
	});

	describe('close', () => {
		it('rejects pending requests', async () => {
			const binding = createClientBinding<RemoteApi>({
				manifest,
				send: vi.fn(),
			});

			const promise = binding.remote.add({ a: 1, b: 2 });
			binding.close();

			await expect(promise).rejects.toThrow('Connection closed');
		});
	});
});
