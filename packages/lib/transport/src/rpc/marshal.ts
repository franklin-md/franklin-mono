import type { RpcRequest, RpcResponse } from './types.js';

/**
 * Returns a copy of `msg` with replaced params.
 */
export function withParams<T>(msg: RpcRequest, params: T): RpcRequest<T> {
	return { ...msg, params } as RpcRequest<T>;
}

/**
 * Constructs a JSON-RPC success response.
 */
export function rpcResponse<T>(
	id: string | number | null,
	result: T,
): RpcResponse<T> {
	return { jsonrpc: '2.0', id, result };
}
