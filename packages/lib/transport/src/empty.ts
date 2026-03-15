import type { Stream } from './streams/types.js';

export function createEmptyReadableStream<T>(): ReadableStream<T> {
	return new ReadableStream<T>({
		pull() {
			// Intentionally never enqueues data.
		},
	});
}

export function createEmptyWritableStream<T>(): WritableStream<T> {
	return new WritableStream<T>({
		write() {
			// Intentionally discards all data.
		},
	});
}

export function createEmptyStream<T>(): Stream<T> {
	let readableController!: ReadableStreamDefaultController<T>;

	const readable = new ReadableStream<T>({
		start(controller) {
			readableController = controller;
		},
	});

	return {
		readable,
		writable: createEmptyWritableStream<T>(),
		close: async () => {
			try {
				readableController.close();
			} catch {
				// Already closed.
			}
		},
	};
}
