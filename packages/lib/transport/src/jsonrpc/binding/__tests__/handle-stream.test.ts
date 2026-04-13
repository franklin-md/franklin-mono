import { describe, expect, it, vi } from 'vitest';
import type { ClientBindingState } from '../runtime/types.js';
import {
	handleResponseForStream,
	handleStreamUpdateNotification,
} from '../runtime/client/dispatch/stream.js';
import { AsyncEventQueue } from '../event-queue.js';
import { RpcError } from '../../errors.js';

function createClientState(
	overrides?: Partial<ClientBindingState>,
): ClientBindingState {
	return {
		send: vi.fn(),
		nextId: 0,
		pendingRequests: new Map(),
		pendingStreams: new Map(),
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
