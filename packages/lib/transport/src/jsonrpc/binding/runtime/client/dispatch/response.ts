import { RpcError } from '../../../../errors.js';
import type { JsonRpcMessage } from '../../../../types.js';

interface PendingResponseHandlers<TPending> {
	onError: (pending: TPending, error: RpcError) => void;
	onResult: (pending: TPending, result: unknown) => void;
}

export function handlePendingResponse<TPending>(
	pendingById: Map<number, TPending>,
	msg: JsonRpcMessage & { id: number },
	handlers: PendingResponseHandlers<TPending>,
): boolean {
	const pending = pendingById.get(msg.id);
	if (!pending) return false;
	pendingById.delete(msg.id);
	if ('error' in msg) {
		const { code, message, data } = msg.error;
		handlers.onError(pending, new RpcError(code, message, data));
	} else {
		handlers.onResult(pending, (msg as { result: unknown }).result);
	}
	return true;
}
