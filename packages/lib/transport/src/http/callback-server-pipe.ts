import type { HttpCallbackServer } from './index.js';
import type { Pipe } from '../pipe.js';

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
export function createCallbackServerPipe(server: HttpCallbackServer): {
	pipe: Pipe;
	dispose: () => void;
} {
	let nextRequestId = 0;
	const pending = new Map<string, PendingRequest>();
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	let readableController!: ReadableStreamDefaultController<Uint8Array>;
	let lineBuffer = '';

	const readable = new ReadableStream<Uint8Array>({
		start(controller) {
			readableController = controller;
		},
	});

	function processLines(): void {
		let newlineIdx: number;
		while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
			const line = lineBuffer.slice(0, newlineIdx).trim();
			lineBuffer = lineBuffer.slice(newlineIdx + 1);

			if (!line) continue;

			try {
				const msg = JSON.parse(line) as {
					id: string;
					result?: unknown;
					error?: string;
				};
				const entry = pending.get(msg.id);
				if (entry) {
					pending.delete(msg.id);
					if (msg.error) {
						entry.reject(new Error(msg.error));
					} else {
						entry.resolve(msg.result);
					}
				}
			} catch {
				// Malformed line — skip
			}
		}
	}

	const writable = new WritableStream<Uint8Array>({
		write(chunk) {
			lineBuffer += decoder.decode(chunk, { stream: true });
			processLines();
		},
		close() {
			// Flush any remaining decoder state
			lineBuffer += decoder.decode();
			processLines();
		},
	});

	// Register the HTTP handler: serialize requests as NDJSON, wait for responses.
	// The pending entry is registered BEFORE enqueue to prevent a race where the
	// response arrives (via a synchronous in-process pipe) before the entry exists.
	server.onRequest(async (body) => {
		const id = `req-${nextRequestId++}`;

		const responsePromise = new Promise<unknown>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		const line = JSON.stringify({ id, body }) + '\n';
		readableController.enqueue(encoder.encode(line));

		return responsePromise;
	});

	return {
		pipe: { readable, writable },
		dispose() {
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
