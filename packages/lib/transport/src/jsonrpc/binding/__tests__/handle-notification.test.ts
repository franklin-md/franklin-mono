import { describe, expect, it, vi } from 'vitest';
import type { ServerBindingState } from '../runtime/types.js';
import { handleNotificationMessage } from '../runtime/server/dispatch/notification.js';

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

const manifest = { greet: { kind: 'notification' as const } };

describe('handleNotificationMessage', () => {
	it('returns false for request messages', () => {
		const state = createServerState();
		const result = handleNotificationMessage(
			state,
			manifest,
			{ greet: vi.fn() },
			{ jsonrpc: '2.0', id: 1, method: 'greet', params: {} },
		);
		expect(result).toBe(false);
	});

	it('returns false for response messages', () => {
		const state = createServerState();
		const result = handleNotificationMessage(
			state,
			manifest,
			{ greet: vi.fn() },
			{ jsonrpc: '2.0', id: 1, result: 42 },
		);
		expect(result).toBe(false);
	});

	it('returns false when manifest kind is not notification', () => {
		const state = createServerState();
		const result = handleNotificationMessage(
			state,
			{ greet: { kind: 'request' } },
			{ greet: vi.fn() },
			{ jsonrpc: '2.0', method: 'greet', params: {} },
		);
		expect(result).toBe(false);
	});

	it('calls handler and returns true', async () => {
		const state = createServerState();
		const handler = vi.fn().mockResolvedValue(undefined);
		const result = handleNotificationMessage(
			state,
			manifest,
			{ greet: handler },
			{ jsonrpc: '2.0', method: 'greet', params: { name: 'world' } },
		);

		expect(result).toBe(true);
		await vi.waitFor(() =>
			expect(handler).toHaveBeenCalledWith({ name: 'world' }),
		);
	});

	it('does not send any response', async () => {
		const state = createServerState();
		const handler = vi.fn().mockResolvedValue(undefined);
		handleNotificationMessage(
			state,
			manifest,
			{ greet: handler },
			{ jsonrpc: '2.0', method: 'greet', params: {} },
		);

		await vi.waitFor(() => expect(handler).toHaveBeenCalled());
		expect(state.send).not.toHaveBeenCalled();
	});

	it('reports handler errors via state.onError', async () => {
		const error = new Error('handler boom');
		const state = createServerState();
		handleNotificationMessage(
			state,
			manifest,
			{ greet: vi.fn().mockRejectedValue(error) },
			{ jsonrpc: '2.0', method: 'greet', params: {} },
		);

		await vi.waitFor(() => expect(state.onError).toHaveBeenCalledWith(error));
	});
});
