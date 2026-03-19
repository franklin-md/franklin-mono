/**
 * JSON-RPC 2.0 message types.
 *
 * Structurally compatible with `AnyMessage` from @agentclientprotocol/sdk
 * so these can be used as drop-in replacements.
 */

export interface RpcRequest<T = unknown> {
	jsonrpc: '2.0';
	id: string | number | null;
	method: string;
	params: T;
}

export interface RpcNotification<T = unknown> {
	jsonrpc: '2.0';
	method: string;
	params: T;
}

export interface RpcResponse<T = unknown> {
	jsonrpc: '2.0';
	id: string | number | null;
	result: T;
}

export interface RpcError {
	jsonrpc: '2.0';
	id: string | number | null;
	error: { code: number; message: string; data?: unknown };
}

export type RpcMessage = RpcRequest | RpcNotification | RpcResponse | RpcError;
