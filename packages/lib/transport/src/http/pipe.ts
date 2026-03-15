import type { Stream } from '../streams/types.js';
import { createNdjsonDecoder, encodeNdjsonLine } from '../streams/ndjson.js';
import type { Options, createJSONServer } from './index.js';
import type { Response } from './types.js';

/**
 * NDJSON protocol used over the pipe:
 *
 *   → readable (server→client): {"id":"...","body":{...}}
 *   ← writable (client→server): {"id":"...","result":{...}} or {"id":"...","error":"..."}
 */

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

/**
 * Wraps an {@link HttpCallbackServer} as a {@link Pipe}.
 *
 * When an HTTP request arrives at the callback server, it is serialized as an
 * NDJSON line on the `readable` side. The matching response is expected as an
 * NDJSON line on the `writable` side. This allows `connect(callbackServerPipe, ipcPipe)`
 * to transparently relay tool-call traffic across process boundaries.
 *
 * Takes ownership of the server's `onRequest` slot — callers must not register
 * another handler after calling this function.
 */
export function createCallbackServerPipe(
	options: Omit<Options, 'handler'>,
): Stream<Uint8Array> {
	let nextRequestId = 0;
	const pending = new Map<string, PendingRequest>();
	const responseDecoder = createNdjsonDecoder<Response>();
	let readableController!: ReadableStreamDefaultController<Uint8Array>;

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			readableController = controller;
		},
	});

	function handleResponse(msg: Response): void {
		const entry = pending.get(msg.id);
		if (!entry) return;

		pending.delete(msg.id);
		if ('error' in msg) {
			entry.reject(new Error(msg.error));
		} else {
			entry.resolve(msg.result);
		}
	}

	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			for (const msg of responseDecoder.write(chunk)) {
				handleResponse(msg);
			}
		},
		close() {
			for (const msg of responseDecoder.flush()) {
				handleResponse(msg);
			}
		},
	});

	const handler = async (body) => {
		const id = `req-${nextRequestId++}`;

		const responsePromise = new Promise<unknown>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		readableController.enqueue(encodeNdjsonLine({ id, body }));

		return responsePromise;
	};

	const server = createJSONServer({
		handler,
		...options,
	});

	return {
		readable,
		writable,
		close: async () => {
			// Reject all pending requests
			for (const [, entry] of pending) {
				entry.reject(new Error('Callback server pipe disposed'));
			}
			pending.clear();

			try {
				readableController.close();
			} catch {
				// Already closed
			}

			void writable
				.abort(new Error('Callback server pipe disposed'))
				.catch(() => {});
		},
	};
}
