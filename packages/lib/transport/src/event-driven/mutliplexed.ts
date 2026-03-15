import type { Stream } from '@franklin/transport';
import { createEventStream, type EventInterface } from './single.js';

export type IdPacket<T> = {
	id: string;
	data: T;
};

export type MultiplexedEventInterface<T> = EventInterface<IdPacket<T>>;

export function createMultiplexedEventStream<T>(
	channelName: string,
	handle: MultiplexedEventInterface<T>,
): Stream<T> {
	const on = (callback: (_: T) => void) => {
		return handle.on((packet: IdPacket<T>) => {
			if (packet.id !== channelName) return;
			callback(packet.data);
		});
	};

	const invoke = (data: T) => {
		handle.invoke({ id: channelName, data });
	};

	return createEventStream<T>({ on, invoke });
}
