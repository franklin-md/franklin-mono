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
	return createMultiplexedEventStream<unknown>(
		streamName,
		window.ipcStream,
	) as Stream<T>;
}
