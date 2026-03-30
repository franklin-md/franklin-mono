import type { JsonRpcMessage } from '../../../../types.js';
import { isStreamUpdateNotification } from '../../../../types.js';
import type { ClientBindingState } from '../../types.js';
import { handlePendingResponse } from './response.js';

export function handleResponseForStream(
	state: ClientBindingState,
	msg: JsonRpcMessage & { id: number },
): boolean {
	return handlePendingResponse(state.pendingStreams, msg, {
		onError: (stream, error) => stream.fail(error),
		onResult: (stream) => stream.complete(),
	});
}

export function handleStreamUpdateNotification(
	state: ClientBindingState,
	msg: JsonRpcMessage,
): boolean {
	if (!isStreamUpdateNotification(msg)) return false;
	const params = msg.params as { requestId: number; body: unknown };
	state.pendingStreams.get(params.requestId)?.push(params.body);
	return true;
}
