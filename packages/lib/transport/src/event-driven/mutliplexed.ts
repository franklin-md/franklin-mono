import type { Stream } from '@franklin/transport';
import { createEventStream, type EventInterface } from './single.js';

export type MultiplexedPacket<T> = {
	channelName: string;
	data: T;
};

export type MultiplexedEventInterface<T> = EventInterface<MultiplexedPacket<T>>;

export function createMultiplexedEventStream<T>(
	channelName: string,
	handle: MultiplexedEventInterface<T>,
): Stream<T> {
	const on = (callback: (_: T) => void) => {
		return () => {
			return handle.on((packet: MultiplexedPacket<T>) => {
				if (packet.channelName !== channelName) return;
				callback(packet.data);
			});
		};
	};

	const invoke = (data: T) => {
		handle.invoke({ channelName, data });
	};

	return createEventStream<T>({ on, invoke });
}
