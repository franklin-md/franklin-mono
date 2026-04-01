// NOTE: This implements the same request-response correlation pattern as
// bridge() and jsonrpc/connection. See BridgeRequest/BridgeResponse for
// the generalized version of this pattern.

import type { Duplex } from '../streams/types.js';
import { createNdjsonDecoder, encodeNdjsonLine } from '../streams/ndjson.js';
import type { HttpJsonServer } from './index.js';
import type { Response } from './types.js';

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

// The readable is a stream of requests that need to get pumped out
// The writable is a stream of responses that need to get matched to the requests.

export function asStream(server: HttpJsonServer): Duplex<Uint8Array> {
	let nextRequestId = 0;
	// A collection of futures. They get resolved when the writable pulls out a response and it matches the request.
	const pending = new Map<string, PendingRequest>();
	const responseDecoder = createNdjsonDecoder<Response>();
	let readableController!: ReadableStreamDefaultController<Uint8Array>;

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			readableController = controller;
		},
	});

	// The call back that should get used to match that response to the request.
	function handleResponse(message: Response): void {
		const entry = pending.get(message.id);
		if (!entry) return;

		pending.delete(message.id);
		if ('error' in message) {
			entry.reject(new Error(message.error));
			return;
		}
		entry.resolve(message.result);
	}

	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			for (const message of responseDecoder.write(chunk)) {
				handleResponse(message);
			}
		},
		close() {
			for (const message of responseDecoder.flush()) {
				handleResponse(message);
			}
		},
	});

	const handler = async (body: unknown) => {
		const id = `req-${nextRequestId++}`;
		const responsePromise = new Promise<unknown>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		readableController.enqueue(encodeNdjsonLine({ id, body }));

		return responsePromise;
	};

	server.onRequest(handler);

	return {
		readable,
		writable,
		close: async () => {
			for (const [, entry] of pending) {
				entry.reject(new Error('Callback server pipe disposed'));
			}
			pending.clear();

			try {
				readableController.close();
			} catch {
				// Already closed.
			}

			void writable
				.abort(new Error('Callback server pipe disposed'))
				.catch(() => {});
		},
	};
}
