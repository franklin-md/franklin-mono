export interface Stream<ReadT, WriteT = ReadT> {
	readonly readable: ReadableStream<ReadT>;
	readonly writable: WritableStream<WriteT>;

	readonly close: () => Promise<void>;
}
