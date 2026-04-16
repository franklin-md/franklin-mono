export function emptyReadable<T>(): ReadableStream<T> {
	return new ReadableStream<T>({
		start(controller) {
			controller.close();
		},
	});
}
