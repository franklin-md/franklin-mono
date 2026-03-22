import type { JsonRpcMessage } from '../../../../types.js';
import { isStreamUpdateNotification } from '../../../../types.js';
import { RpcError } from '../../../../errors.js';
import type { ClientBindingState } from '../../types.js';

export function handleResponseForStream(
	state: ClientBindingState,
	msg: JsonRpcMessage & { id: number },
): boolean {
	const stream = state.pendingStreams.get(msg.id);
	if (!stream) return false;
	state.pendingStreams.delete(msg.id);
	if ('error' in msg) {
		const error = msg.error as {
			code: number;
			message: string;
			data?: unknown;
		};
		stream.fail(new RpcError(error.code, error.message, error.data));
	} else {
		stream.complete();
	}
	return true;
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
