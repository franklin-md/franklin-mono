export interface Stream<T> {
	readonly readable: ReadableStream<T>;
	readonly writable: WritableStream<T>;

	readonly close: () => Promise<void>;
}
