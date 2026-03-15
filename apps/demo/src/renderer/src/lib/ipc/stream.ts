import type { Stream } from '@franklin/agent/browser';
import {
	type MultiplexedEventInterface,
	createMultiplexedEventStream,
} from '@franklin/transport';

declare global {
	interface Window {
		ipcStream: MultiplexedEventInterface<unknown>;
	}
}

export function createIpcStream<T>(streamName: string): Stream<T> {
	return createMultiplexedEventStream(streamName, window.ipcStream);
}
