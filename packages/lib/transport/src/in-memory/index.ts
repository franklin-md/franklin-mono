import { connect } from '../streams/connect.js';
import type { Stream } from '../streams/types.js';

export interface MemoryPipePair<T> {
	streamA: Stream<T>;
	streamB: Stream<T>;
	close: () => Promise<void>;
}

export function createMemoryStream<T>(): Stream<T> {
	const stream = new TransformStream<T>();

	return {
		readable: stream.readable,
		writable: stream.writable,
		close: async () => {
			await stream.writable.close();
		},
	};
}

export function createMemoryPipes<T = Uint8Array>(): MemoryPipePair<T> {
	const streamA = createMemoryStream<T>();
	const streamB = createMemoryStream<T>();
	const joined = connect(streamA, streamB);

	return {
		streamA: streamA,
		streamB: streamB,
		close: async () => {
			await joined.close();
		},
	};
}
