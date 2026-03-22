import { describe, expect, it, vi } from 'vitest';
import type {
	ClientBindingState,
	ServerBindingState,
} from '../runtime/types.js';
import { handleRequestMessage } from '../runtime/server/dispatch/request.js';
import { handleResponseForRequest } from '../runtime/client/dispatch/request.js';
import { RpcError } from '../../errors.js';

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

const manifest = { add: { kind: 'request' as const } };

describe('handleRequestMessage', () => {
	it('returns false for notification messages', () => {
		const state = createServerState();
		const result = handleRequestMessage(
			state,
			manifest,
			{ add: vi.fn() },
			{ jsonrpc: '2.0', method: 'add', params: {} },
		);
		expect(result).toBe(false);
	});

	it('returns false when manifest kind is not request', () => {
		const state = createServerState();
		const result = handleRequestMessage(
			state,
			{ add: { kind: 'notification' } },
			{ add: vi.fn() },
			{ jsonrpc: '2.0', id: 1, method: 'add', params: {} },
		);
		expect(result).toBe(false);
	});

	it('calls handler and sends success response', async () => {
		const state = createServerState();
		const handler = vi.fn().mockResolvedValue(42);
		handleRequestMessage(
			state,
			manifest,
			{ add: handler },
			{ jsonrpc: '2.0', id: 7, method: 'add', params: { a: 1, b: 2 } },
		);

		await vi.waitFor(() =>
			expect(state.send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				id: 7,
				result: 42,
			}),
		);
		expect(handler).toHaveBeenCalledWith({ a: 1, b: 2 });
	});

	it('sends RpcError response when handler throws RpcError', async () => {
		const state = createServerState();
		const rpcError = new RpcError(-32000, 'custom error', { detail: 'x' });
		handleRequestMessage(
			state,
			manifest,
			{ add: vi.fn().mockRejectedValue(rpcError) },
			{ jsonrpc: '2.0', id: 3, method: 'add', params: {} },
		);

		await vi.waitFor(() =>
			expect(state.send).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				id: 3,
				error: rpcError.toPayload(),
			}),
		);
	});

	it('sends internal error response when handler throws plain Error', async () => {
		const state = createServerState();
		handleRequestMessage(
			state,
			manifest,
			{ add: vi.fn().mockRejectedValue(new Error('boom')) },
			{ jsonrpc: '2.0', id: 5, method: 'add', params: {} },
		);

		await vi.waitFor(() => {
			expect(state.send).toHaveBeenCalled();
			const payload = (state.send as ReturnType<typeof vi.fn>).mock
				.calls[0]![0] as {
				id: number;
				error: { code: number; message: string };
			};
			expect(payload.id).toBe(5);
			expect(payload.error.code).toBe(-32603);
			expect(payload.error.message).toBe('boom');
		});
	});
});

describe('handleResponseForRequest', () => {
	it('resolves pending request on success response', () => {
		const resolve = vi.fn();
		const reject = vi.fn();
		const state = createClientState();
		state.pendingRequests.set(10, { resolve, reject });

		const result = handleResponseForRequest(state, {
			jsonrpc: '2.0',
			id: 10,
			result: 'hello',
		} as never);

		expect(result).toBe(true);
		expect(resolve).toHaveBeenCalledWith('hello');
		expect(reject).not.toHaveBeenCalled();
		expect(state.pendingRequests.has(10)).toBe(false);
	});

	it('rejects pending request on error response', () => {
		const resolve = vi.fn();
		const reject = vi.fn();
		const state = createClientState();
		state.pendingRequests.set(11, { resolve, reject });

		const result = handleResponseForRequest(state, {
			jsonrpc: '2.0',
			id: 11,
			error: { code: -32600, message: 'Invalid' },
		} as never);

		expect(result).toBe(true);
		expect(resolve).not.toHaveBeenCalled();
		expect(reject).toHaveBeenCalled();
		const err = reject.mock.calls[0]![0] as RpcError;
		expect(err).toBeInstanceOf(RpcError);
		expect(err.code).toBe(-32600);
		expect(state.pendingRequests.has(11)).toBe(false);
	});

	it('returns false when no pending request matches', () => {
		const state = createClientState();
		const result = handleResponseForRequest(state, {
			jsonrpc: '2.0',
			id: 99,
			result: null,
		} as never);
		expect(result).toBe(false);
	});
});
