import { createNdjsonDecoder, encodeNdjsonLine } from '../../streams/ndjson.js';
import type { Stream } from '../../streams/types.js';
import type { HttpCallbackServer } from './server.js';
import type { Response } from './types.js';

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

export interface CallbackServerPipe {
	pipe: Stream<Uint8Array>;
	dispose: () => Promise<void>;
}

export function createHttpJsonLoopbackStream(
	server: HttpCallbackServer,
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

	server.onRequest(async (body) => {
		const id = `req-${nextRequestId++}`;
		const response = new Promise<unknown>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		readableController.enqueue(encodeNdjsonLine({ id, body }));

		return response;
	});

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

			await writable
				.abort(new Error('Callback server pipe disposed'))
				.catch(() => {});
		},
	};
}

export function createCallbackServerPipe(
	server: HttpCallbackServer,
): CallbackServerPipe {
	const pipe = createHttpJsonLoopbackStream(server);

	return {
		pipe,
		dispose: pipe.close,
	};
}

export const createCallbackServerServer = createCallbackServerPipe;
