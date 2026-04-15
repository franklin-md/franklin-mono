import type { Duplex } from '../types.js';

interface PendingRequest<Res> {
	resolve: (value: Res) => void;
	reject: (reason: Error) => void;
}

export interface BridgeRequest<Req> {
	id: string;
	body: Req;
}

export interface BridgeSuccessResponse<Res> {
	id: string;
	result: Res;
}

export interface BridgeErrorResponse {
	id: string;
	error: string;
}

export type BridgeResponse<Res> =
	| BridgeSuccessResponse<Res>
	| BridgeErrorResponse;

export interface Bridge<Req, Res> {
	handler: (request: Req) => Promise<Res>;
	duplex: Duplex<BridgeRequest<Req>, BridgeResponse<Res>>;
}

/**
 * Creates a correlated request-response bridge.
 *
 * Calling handler(req) enqueues a request onto the duplex's readable side
 * and returns a promise. Writing a matching response to the duplex's writable
 * side resolves or rejects that promise.
 *
 * The readable emits { id, body } objects.
 * The writable accepts { id, result } or { id, error } objects.
 */
export function bridge<Req, Res>(): Bridge<Req, Res> {
	let nextRequestId = 0;
	const pending = new Map<string, PendingRequest<Res>>();
	let readableController!: ReadableStreamDefaultController<BridgeRequest<Req>>;

	const readable = new ReadableStream<BridgeRequest<Req>>({
		start(controller) {
			readableController = controller;
		},
	});

	function handleResponse(message: BridgeResponse<Res>): void {
		const entry = pending.get(message.id);
		if (!entry) return;

		pending.delete(message.id);
		if ('error' in message) {
			entry.reject(new Error(message.error));
			return;
		}
		entry.resolve(message.result);
	}

	const writable = new WritableStream<BridgeResponse<Res>>({
		write(message) {
			handleResponse(message);
		},
	});

	const handler = (body: Req): Promise<Res> => {
		const id = `req-${nextRequestId++}`;
		const responsePromise = new Promise<Res>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		readableController.enqueue({ id, body });

		return responsePromise;
	};

	return {
		handler,
		duplex: {
			readable,
			writable,
			dispose: async () => {
				for (const [, entry] of pending) {
					entry.reject(new Error('Bridge disposed'));
				}
				pending.clear();

				try {
					readableController.close();
				} catch {
					// Already closed
				}

				void writable.abort(new Error('Bridge disposed')).catch(() => {});
			},
		},
	};
}
