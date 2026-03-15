export function createEmptyReadableStream<T>(): ReadableStream<T> {
	return new ReadableStream<T>({
		start(controller) {
			controller.close();
		},
	});
}

export function createEmptyWritableStream<T>(): WritableStream<T> {
	return new WritableStream<T>({
		write() {},
	});
}
