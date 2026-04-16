import { createNdjsonDecoder, encodeNdjsonLine } from '../streams/ndjson.js';

import type { Codec } from './types.js';

export function ndjsonCodec<T>(): Codec<Uint8Array, T> {
	// manages the buffering.
	const decoder = createNdjsonDecoder<T>();

	return {
		decode: (chunk) => decoder.write(chunk),
		encode: (value) => encodeNdjsonLine(value),
	};
}
