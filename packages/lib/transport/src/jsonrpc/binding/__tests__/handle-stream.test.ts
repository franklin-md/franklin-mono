import { describe, expect, it, vi } from 'vitest';
import type {
	ClientBindingState,
	ServerBindingState,
} from '../runtime/types.js';
import {
	handleResponseForStream,
	handleStreamUpdateNotification,
} from '../runtime/client/dispatch/stream.js';
import {
	handleStreamCancelNotification,
	handleStreamRequest,
} from '../runtime/server/dispatch/stream.js';
import { AsyncEventQueue } from '../event-queue.js';
import { RpcError } from '../../errors.js';

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

function createServerState(
	overrides?: Partial<ServerBindingState>,
): ServerBindingState {
	return {
		send: vi.fn(),
		onError: vi.fn(),
		activeStreams: new Map(),
		...overrides,
	};
}

describe('handleResponseForStream', () => {
	it('completes pending stream on success response', () => {
		const queue = new AsyncEventQueue<unknown>(() => {});
		const completeSpy = vi.spyOn(queue, 'complete');
		const state = createClientState();
		state.pendingStreams.set(5, queue);

		const result = handleResponseForStream(state, {
			jsonrpc: '2.0',
			id: 5,
			result: null,
		} as never);

		expect(result).toBe(true);
		expect(completeSpy).toHaveBeenCalled();
		expect(state.pendingStreams.has(5)).toBe(false);
	});

	it('fails pending stream on error response', () => {
		const queue = new AsyncEventQueue<unknown>(() => {});
		const failSpy = vi.spyOn(queue, 'fail');
		const state = createClientState();
		state.pendingStreams.set(6, queue);

		const result = handleResponseForStream(state, {
			jsonrpc: '2.0',
			id: 6,
			error: { code: -32000, message: 'stream error' },
		} as never);

		expect(result).toBe(true);
		expect(failSpy).toHaveBeenCalled();
		const err = failSpy.mock.calls[0]![0] as RpcError;
		expect(err).toBeInstanceOf(RpcError);
		expect(err.code).toBe(-32000);
	});

	it('returns false when no pending stream matches', () => {
		const state = createClientState();
		const result = handleResponseForStream(state, {
			jsonrpc: '2.0',
			id: 99,
			result: null,
		} as never);
		expect(result).toBe(false);
	});
});

describe('handleStreamUpdateNotification', () => {
	it('pushes value to pending stream on update notification', () => {
		const queue = new AsyncEventQueue<unknown>(() => {});
		const pushSpy = vi.spyOn(queue, 'push');
		const state = createClientState();
		state.pendingStreams.set(3, queue);

		const result = handleStreamUpdateNotification(state, {
			jsonrpc: '2.0',
			method: 'events/update',
			params: { requestId: 3, body: { data: 'hello' } },
		});

		expect(result).toBe(true);
		expect(pushSpy).toHaveBeenCalledWith({ data: 'hello' });
	});

	it('returns false for non-update messages', () => {
		const state = createClientState();
		const result = handleStreamUpdateNotification(state, {
			jsonrpc: '2.0',
			method: 'add',
			params: {},
		});
		expect(result).toBe(false);
	});
});

describe('handleStreamCancelNotification', () => {
	it('cancels active stream on cancel notification', () => {
		const returnFn = vi.fn();
		const iterator = { return: returnFn } as unknown as AsyncIterator<unknown>;
		const state = createServerState();
		state.activeStreams.set(4, iterator);

		const result = handleStreamCancelNotification(state, {
			jsonrpc: '2.0',
			method: '$/stream/cancel',
			params: { requestId: 4 },
		});

		expect(result).toBe(true);
		expect(returnFn).toHaveBeenCalled();
		expect(state.activeStreams.has(4)).toBe(false);
	});

	it('returns false for non-cancel messages', () => {
		const state = createServerState();
		const result = handleStreamCancelNotification(state, {
			jsonrpc: '2.0',
			method: 'add',
			params: {},
		});
		expect(result).toBe(false);
	});
});

describe('handleStreamRequest', () => {
	const manifest = { events: { kind: 'event' as const } };

	it('returns false for notification messages', () => {
		const state = createServerState();
		const result = handleStreamRequest(
			state,
			manifest,
			{ events: vi.fn() },
			{ jsonrpc: '2.0', method: 'events', params: {} },
		);
		expect(result).toBe(false);
	});

	it('returns false when manifest kind is not event', () => {
		const state = createServerState();
		const result = handleStreamRequest(
			state,
			{ events: { kind: 'request' } },
			{ events: vi.fn() },
			{ jsonrpc: '2.0', id: 1, method: 'events', params: {} },
		);
		expect(result).toBe(false);
	});

	it('streams updates and sends completion response', async () => {
		const state = createServerState();
		async function* generate() {
			yield 'a';
			yield 'b';
		}

		handleStreamRequest(
			state,
			manifest,
			{ events: () => generate() },
			{ jsonrpc: '2.0', id: 1, method: 'events', params: {} },
		);

		await vi.waitFor(() => {
			const calls = (state.send as ReturnType<typeof vi.fn>).mock.calls;
			expect(calls).toHaveLength(3);
		});

		const calls = (state.send as ReturnType<typeof vi.fn>).mock
			.calls as unknown[][];
		expect(calls[0]![0]).toMatchObject({
			method: 'events/update',
			params: { requestId: 1, body: 'a' },
		});
		expect(calls[1]![0]).toMatchObject({
			method: 'events/update',
			params: { requestId: 1, body: 'b' },
		});
		expect(calls[2]![0]).toMatchObject({
			jsonrpc: '2.0',
			id: 1,
			result: null,
		});
	});

	it('sends error response when generator throws', async () => {
		const state = createServerState();
		async function* generate() {
			yield 'ok';
			throw new Error('gen error');
		}

		handleStreamRequest(
			state,
			manifest,
			{ events: () => generate() },
			{ jsonrpc: '2.0', id: 2, method: 'events', params: {} },
		);

		await vi.waitFor(() => {
			const calls = (state.send as ReturnType<typeof vi.fn>).mock.calls;
			expect(calls.length).toBeGreaterThanOrEqual(2);
		});

		const calls = (state.send as ReturnType<typeof vi.fn>).mock
			.calls as unknown[][];
		const lastCall = calls[calls.length - 1]![0] as {
			id: number;
			error: { code: number };
		};
		expect(lastCall.id).toBe(2);
		expect(lastCall.error.code).toBe(-32603);
	});

	it('registers and cleans up activeStreams', async () => {
		const state = createServerState();
		async function* generate() {
			yield 'x';
		}

		handleStreamRequest(
			state,
			manifest,
			{ events: () => generate() },
			{ jsonrpc: '2.0', id: 8, method: 'events', params: {} },
		);

		// Should be registered immediately
		expect(state.activeStreams.has(8)).toBe(true);

		// Wait for completion
		await vi.waitFor(() => expect(state.activeStreams.has(8)).toBe(false));
	});
});
