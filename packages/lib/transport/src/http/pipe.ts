import type { Stream } from '../streams/types.js';
import { createNdjsonDecoder, encodeNdjsonLine } from '../streams/ndjson.js';
import { createJSONServer } from './index.js';
import type { Options } from './index.js';
import type { Response } from './types.js';

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

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

	void createJSONServer({
		handler,
		...options,
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

			void writable
				.abort(new Error('Callback server pipe disposed'))
				.catch(() => {});
		},
	};
}
