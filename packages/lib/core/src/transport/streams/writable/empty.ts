export function emptyWritable<T>(): WritableStream<T> {
	return new WritableStream<T>({
		write() {},
	});
}
