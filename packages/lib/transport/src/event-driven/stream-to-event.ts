import type { Stream } from '../streams/types.js';
import { observe } from '../streams/observe.js';
import type { EventInterface } from './single.js';

/**
 * Adapts a Stream<T> into an EventInterface<T>.
 *
 * - on     → observe(stream.readable).subscribe
 * - invoke → stream.writable writer.write
 *
 * This enables a second level of multiplexing: take a Stream produced by
 * one createMultiplexedEventStream call, convert it back to an
 * EventInterface, then pass it to a second createMultiplexedEventStream
 * to demux by a different key (e.g. agentId).
 *
 * Takes ownership of the stream — the readable is consumed by the
 * observer pump and the writable is locked by a writer.
 */
export function streamToEventInterface<T>(
	stream: Stream<T>,
): EventInterface<T> {
	const { subscribe } = observe(stream.readable);
	const writer = stream.writable.getWriter();

	return {
		on: subscribe,
		invoke: (data: T) => {
			void writer.write(data);
		},
	};
}
