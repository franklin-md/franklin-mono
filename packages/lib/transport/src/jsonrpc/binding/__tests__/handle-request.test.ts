import { describe, expect, it, vi } from 'vitest';
import type { ClientBindingState } from '../runtime/types.js';
import { handleResponseForRequest } from '../runtime/client/dispatch/request.js';
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
