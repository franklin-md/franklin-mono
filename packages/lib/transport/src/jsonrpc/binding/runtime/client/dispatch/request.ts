import type { JsonRpcMessage } from '../../../../types.js';
import type { ClientBindingState } from '../../types.js';
import { RpcError } from '../../../../errors.js';

export function handleResponseForRequest(
	state: ClientBindingState,
	msg: JsonRpcMessage & { id: number },
): boolean {
	const pending = state.pendingRequests.get(msg.id);
	if (!pending) return false;
	state.pendingRequests.delete(msg.id);
	if ('error' in msg) {
		const error = msg.error as {
			code: number;
			message: string;
			data?: unknown;
		};
		pending.reject(new RpcError(error.code, error.message, error.data));
	} else {
		pending.resolve((msg as { result: unknown }).result);
	}
	return true;
}
