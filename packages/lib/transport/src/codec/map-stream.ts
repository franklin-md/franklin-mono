import type { Duplex } from '../streams/types.js';
import type { Codec } from './types.js';

/**
 * Maps a Duplex<Raw> to a Duplex<Typed> using a codec.
 *
 * The readable side decodes raw chunks into typed values (1:N).
 * The writable side encodes typed values into raw chunks (1:1).
 */
export function mapStream<Raw, Typed>(
	stream: Duplex<Raw>,
	codec: Codec<Raw, Typed>,
): Duplex<Typed> {
	const decoded = new TransformStream<Raw, Typed>({
		transform(chunk, controller) {
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

	return {
		readable,
		writable,
		dispose: () => stream.dispose(),
	};
}
