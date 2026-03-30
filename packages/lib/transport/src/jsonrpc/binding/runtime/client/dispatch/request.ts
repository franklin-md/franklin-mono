import type { JsonRpcMessage } from '../../../../types.js';
import type { ClientBindingState } from '../../types.js';
import { handlePendingResponse } from './response.js';

export function handleResponseForRequest(
	state: ClientBindingState,
	msg: JsonRpcMessage & { id: number },
): boolean {
	return handlePendingResponse(state.pendingRequests, msg, {
		onError: (pending, error) => pending.reject(error),
		onResult: (pending, result) => pending.resolve(result),
	});
}
