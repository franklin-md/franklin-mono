export interface Duplex<R, W = R> {
	readonly readable: ReadableStream<R>;
	readonly writable: WritableStream<W>;
	readonly close: () => Promise<void>;
}

/** @deprecated Use Duplex instead */
export type Stream<ReadT, WriteT = ReadT> = Duplex<ReadT, WriteT>;

export type Observer<T> = {
	subscribe: (callback: (data: T) => void) => () => void;
	dispose: () => void;
};
