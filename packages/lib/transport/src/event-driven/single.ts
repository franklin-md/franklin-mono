import type { Stream } from '@franklin/transport';

export type EventInterface<T> = {
	on: (callback: (data: T) => void) => () => void;
	invoke: (data: T) => void;
};

export function createEventStream<T>(handle: EventInterface<T>): Stream<T> {
	let readableController: ReadableStreamDefaultController<T>;

	const readable = new ReadableStream<T>({
		start(controller) {
			readableController = controller;
		},
	});

	// Forward any incoming data onto the readable stream
	const onData = (data: T): void => {
		readableController.enqueue(data);
	};
	const unsubscribe = handle.on(onData);

	// Forward any outgoing data onto the IPC channel
	const writable = new WritableStream<T>({
		write(data) {
			handle.invoke(data);
		},
	});

	return {
		readable,
		writable,
		close: async () => {
			unsubscribe();
			try {
				readableController.close();
			} catch {
				// Already closed
			}
		},
	};
}
