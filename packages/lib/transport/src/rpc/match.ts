import type {
	RpcError,
	RpcMessage,
	RpcNotification,
	RpcRequest,
	RpcResponse,
} from './types.js';

/**
 * Returns the message as an RpcRequest if it has a matching method, or
 * undefined otherwise. Narrows `params` to `T`.
 */
export function matchRequest<T = unknown>(
	msg: RpcMessage,
	method: string,
): RpcRequest<T> | undefined {
	if ('method' in msg && 'id' in msg && msg.method === method) {
		return msg as RpcRequest<T>;
	}
	return undefined;
}

/**
 * Returns the message as an RpcNotification if it has a matching method
 * and no `id`, or undefined otherwise.
 */
export function matchNotification<T = unknown>(
	msg: RpcMessage,
	method: string,
): RpcNotification<T> | undefined {
	if ('method' in msg && !('id' in msg) && msg.method === method) {
		return msg as RpcNotification<T>;
	}
	return undefined;
}

/**
 * Returns true if the message is a request or notification (has a `method`).
 */
export function isRequestOrNotification(
	msg: RpcMessage,
): msg is RpcRequest | RpcNotification {
	return 'method' in msg;
}

/**
 * Returns true if the message is a response (has `result` or `error`, no `method`).
 */
export function isResponse(msg: RpcMessage): msg is RpcResponse | RpcError {
	return !('method' in msg) && 'id' in msg;
}
