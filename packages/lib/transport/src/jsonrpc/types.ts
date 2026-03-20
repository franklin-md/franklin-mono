export type JsonRpcRequest<P = unknown, M extends string = string> = {
	jsonrpc: '2.0';
	id: number;
	method: M;
	params: P;
};

export type JsonRpcNotification<P = unknown, M extends string = string> = {
	jsonrpc: '2.0';
	method: M;
	params: P;
};

export type JsonRpcSuccess<R = unknown> = {
	jsonrpc: '2.0';
	id: number;
	result: R;
};

export type JsonRpcErrorPayload = {
	code: number;
	message: string;
	data?: unknown;
};

export type JsonRpcErrorResponse = {
	jsonrpc: '2.0';
	id: number;
	error: JsonRpcErrorPayload;
};

export type JsonRpcResponse<R = unknown> =
	| JsonRpcSuccess<R>
	| JsonRpcErrorResponse;

export type JsonRpcMessage =
	| JsonRpcRequest
	| JsonRpcNotification
	| JsonRpcResponse;

export function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
	return 'method' in msg && 'id' in msg;
}

export function isNotification(
	msg: JsonRpcMessage,
): msg is JsonRpcNotification {
	return 'method' in msg && !('id' in msg);
}

export function isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
	return !('method' in msg) && 'id' in msg;
}
