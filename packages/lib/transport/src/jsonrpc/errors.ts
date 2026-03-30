import type { JsonRpcErrorPayload } from './types.js';

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

export class RpcError extends Error {
	constructor(
		public readonly code: number,
		message: string,
		public readonly data?: unknown,
	) {
		super(message);
		this.name = 'RpcError';
	}

	toPayload(): JsonRpcErrorPayload {
		return {
			code: this.code,
			message: this.message,
			...(this.data !== undefined && { data: this.data }),
		};
	}

	static parseError(message: string): RpcError {
		return new RpcError(PARSE_ERROR, message);
	}

	static invalidRequest(message: string): RpcError {
		return new RpcError(INVALID_REQUEST, message);
	}

	static methodNotFound(method: string): RpcError {
		return new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
	}

	static invalidParams(message: string): RpcError {
		return new RpcError(INVALID_PARAMS, message);
	}

	static internalError(message: string): RpcError {
		return new RpcError(INTERNAL_ERROR, message);
	}
}
