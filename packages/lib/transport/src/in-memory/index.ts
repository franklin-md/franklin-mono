import { connect } from '../streams/connect.js';
import type { Stream } from '../streams/types.js';

export interface MemoryPipePair<A, B = A> {
	server: Stream<A, B>;
	client: Stream<B, A>;
	close: () => Promise<void>;
}

export function createMemoryStream<A, B = A>(): Stream<A, B> {
	const stream = new TransformStream<B, A>();

	return {
		readable: stream.readable,
		writable: stream.writable,
		close: async () => {
			await stream.writable.close();
		},
	};
}

export function createMemoryPipes<A = Uint8Array, B = A>(): MemoryPipePair<
	A,
	B
> {
	const server = createMemoryStream<A, B>();
	const client = createMemoryStream<B, A>();
	const joined = connect(server, client);

	return {
		server,
		client,
		close: async () => {
			await joined.close();
		},
	};
}
