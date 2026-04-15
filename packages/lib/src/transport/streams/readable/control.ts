type Enqueue<T> = (value: T) => void;

export function createReadControlPair<T>(): [Enqueue<T>, ReadableStream<T>] {
	let enqueue!: Enqueue<T>;
	const readable = new ReadableStream<T>({
		start(c) {
			enqueue = (value) => c.enqueue(value);
		},
	});
	return [enqueue, readable];
}
