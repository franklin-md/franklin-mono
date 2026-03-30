export const STREAM_KIND = Symbol('proxy.stream');

export interface StreamDescriptor<TRead = unknown, _TWrite = TRead> {
	readonly kind: typeof STREAM_KIND;
}

export type StreamLike<TRead = unknown, TWrite = TRead> = {
	readonly readable: ReadableStream<TRead>;
	readonly writable: WritableStream<TWrite>;
	readonly close: () => Promise<void>;
};
