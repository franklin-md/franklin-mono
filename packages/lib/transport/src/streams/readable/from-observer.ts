/**
 * Reverse of observe: takes a subscribe function and returns a ReadableStream.
 *
 * Subscribes when the stream starts, unsubscribes when cancelled.
 * Each callback invocation enqueues a value into the readable.
 */
export function fromObserver<T>(
	subscribe: (callback: (data: T) => void) => () => void,
): ReadableStream<T> {
	let unsubscribe: () => void;

	return new ReadableStream<T>({
		start(controller) {
			unsubscribe = subscribe((value) => {
				controller.enqueue(value);
			});
		},
		cancel() {
			unsubscribe();
		},
	});
}
