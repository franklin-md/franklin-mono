export interface Duplex<R, W = R> {
	readonly readable: ReadableStream<R>;
	readonly writable: WritableStream<W>;
	// TODO(FRA-156): Rename to dispose
	readonly close: () => Promise<void>;
}

/** Extract the read type from a Duplex. */
export type ReadType<D extends Duplex<unknown, unknown>> =
	D extends Duplex<infer R, unknown> ? R : never;

/** Extract the write type from a Duplex. */
export type WriteType<D extends Duplex<unknown, unknown>> =
	D extends Duplex<unknown, infer W> ? W : never;

/** Transport-level middleware: wraps a Duplex, returning a new Duplex. */
export type Middleware<R, W = R> = (transport: Duplex<R, W>) => Duplex<R, W>;

/** @deprecated Use Duplex instead */
export type Stream<ReadT, WriteT = ReadT> = Duplex<ReadT, WriteT>;

export type Observer<T> = {
	subscribe: (callback: (data: T) => void) => () => void;
	dispose: () => void;
};
