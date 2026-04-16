/**
 * Reverse of callable: takes a function and returns a WritableStream
 * that calls it on each write.
 */
export function fromCallable<T>(
	fn: (value: T) => void | Promise<void>,
): WritableStream<T> {
	return new WritableStream<T>({
		write(value) {
			return Promise.resolve(fn(value));
		},
	});
}
