import type { Duplex } from '../streams/types.js';
import { observe } from '../streams/readable/observe.js';
import { callable } from '../streams/writable/callable.js';
import type { EventInterface } from './single.js';

/**
 * Adapts a Duplex<T> into an EventInterface<T>.
 *
 * - on     → observe(stream.readable).subscribe
 * - invoke → callable(stream.writable)
 *
 * This enables a second level of multiplexing: take a Duplex produced by
 * one createMultiplexedEventStream call, convert it back to an
 * EventInterface, then pass it to a second createMultiplexedEventStream
 * to demux by a different key (e.g. agentId).
 *
 * Takes ownership of the stream — the readable is consumed by the
 * observer pump and the writable is locked by a writer.
 */
export function streamToEventInterface<T>(
	stream: Duplex<T>,
): EventInterface<T> {
	return {
		on: observe(stream.readable).subscribe,
		invoke: callable(stream.writable),
	};
}
