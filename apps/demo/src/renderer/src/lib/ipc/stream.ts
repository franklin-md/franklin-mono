import {
	type MultiplexedEventInterface,
	type Stream,
	createMultiplexedEventStream,
} from '@franklin/transport';

declare global {
	interface Window {
		ipcStream: MultiplexedEventInterface<unknown>;
	}
}

export function createIpcStream<T>(streamName: string): Stream<T> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	return createMultiplexedEventStream<unknown>(
		streamName,
		window.ipcStream,
	) as Stream<T>;
}
