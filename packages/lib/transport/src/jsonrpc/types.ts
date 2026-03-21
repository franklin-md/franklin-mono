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

export type JsonRpcEventInvocation<P = unknown, M extends string = string> = {
	jsonrpc: '2.0';
	method: M;
	params: {
		callId: number;
		params: P;
	};
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

export type JsonRpcEventNextNotification<T = unknown> = JsonRpcNotification<
	{
		callId: number;
		value: T;
	},
	'$/event/next'
>;

export type JsonRpcEventCompleteNotification = JsonRpcNotification<
	{
		callId: number;
	},
	'$/event/complete'
>;

export type JsonRpcEventErrorNotification = JsonRpcNotification<
	{
		callId: number;
		error: JsonRpcErrorPayload;
	},
	'$/event/error'
>;

export type JsonRpcEventCancelNotification = JsonRpcNotification<
	{
		callId: number;
	},
	'$/event/cancel'
>;

export type JsonRpcMessage =
	| JsonRpcRequest
	| JsonRpcNotification
	| JsonRpcResponse
	| JsonRpcEventInvocation
	| JsonRpcEventNextNotification
	| JsonRpcEventCompleteNotification
	| JsonRpcEventErrorNotification
	| JsonRpcEventCancelNotification;

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

export function isEventNextNotification(
	msg: JsonRpcMessage,
): msg is JsonRpcEventNextNotification {
	return isNotification(msg) && msg.method === '$/event/next';
}

export function isEventCompleteNotification(
	msg: JsonRpcMessage,
): msg is JsonRpcEventCompleteNotification {
	return isNotification(msg) && msg.method === '$/event/complete';
}

export function isEventErrorNotification(
	msg: JsonRpcMessage,
): msg is JsonRpcEventErrorNotification {
	return isNotification(msg) && msg.method === '$/event/error';
}

export function isEventCancelNotification(
	msg: JsonRpcMessage,
): msg is JsonRpcEventCancelNotification {
	return isNotification(msg) && msg.method === '$/event/cancel';
}
