import type { Stream } from '../streams/types.js';
import type { Codec } from './types.js';

/**
 * Maps a `Stream<Raw>` to a `Stream<Typed>` using a codec.
 *
 * The readable side decodes raw chunks into typed values (1:N).
 * The writable side encodes typed values into raw chunks (1:1).
 */
export function mapStream<Raw, Typed>(
	stream: Stream<Raw>,
	codec: Codec<Raw, Typed>,
): Stream<Typed> {
	const decoded = new TransformStream<Raw, Typed>({
		transform(chunk, controller) {
			// 1 chunk likely returns 0 or 1 Typed (especially if Raw is Uint8Array)

			// Had we been buffering, this would have been a single add operation followed by
			// a while loop to pull out the values.
			for (const value of codec.decode(chunk)) {
				controller.enqueue(value);
			}
		},
	});

	const encoded = new TransformStream<Typed, Raw>({
		transform(value, controller) {
			controller.enqueue(codec.encode(value));
		},
	});

	const readable = stream.readable.pipeThrough(decoded);
	const writable = encoded.writable;

	// Pump encoded values into the underlying raw writable
	void encoded.readable.pipeTo(stream.writable).catch(() => {});

	// Raw -> Codec decodes -> Typed (READABLE)
	// Typed -> Encode Codex --write -> Raw (WRITABLE)
	return {
		readable,
		writable,
		close: () => stream.close(),
	};
}
