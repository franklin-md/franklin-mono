import { RpcError } from '../../errors.js';
import type { JsonRpcErrorPayload } from '../../types.js';
import type { ClientBindingState } from './types.js';

export function toErrorPayload(error: unknown): JsonRpcErrorPayload {
	if (error instanceof RpcError) {
		return error.toPayload();
	}
	return RpcError.internalError(
		error instanceof Error ? error.message : String(error),
	).toPayload();
}

export function closePending(state: ClientBindingState, error: Error): void {
	for (const [, pending] of state.pendingRequests) {
		pending.reject(error);
	}
	state.pendingRequests.clear();
	for (const [, queue] of state.pendingStreams) {
		queue.fail(error);
	}
	state.pendingStreams.clear();
}
