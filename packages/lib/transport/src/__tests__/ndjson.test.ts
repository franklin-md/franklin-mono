import { describe, expect, it } from 'vitest';

import { createNdjsonDecoder, encodeNdjsonLine } from '../streams/ndjson.js';

describe('ndjson framing', () => {
	it('encodes and decodes a single line', () => {
		const decoder = createNdjsonDecoder<{ ok: boolean }>();
		const messages = decoder.write(encodeNdjsonLine({ ok: true }));

		expect(messages).toEqual([{ ok: true }]);
	});

	it('buffers partial chunks until a newline arrives', () => {
		const decoder = createNdjsonDecoder<{ value: string }>();
		const encoded = encodeNdjsonLine({ value: 'hello' });

		expect(decoder.write(encoded.slice(0, 5))).toEqual([]);
		expect(decoder.write(encoded.slice(5))).toEqual([{ value: 'hello' }]);
	});

	it('skips malformed lines and continues decoding', () => {
		const decoder = createNdjsonDecoder<{ ok: boolean }>();
		const malformed = new TextEncoder().encode('{"broken":\n');
		const valid = encodeNdjsonLine({ ok: true });
		const combined = new Uint8Array(malformed.length + valid.length);

		combined.set(malformed);
		combined.set(valid, malformed.length);

		expect(decoder.write(combined)).toEqual([{ ok: true }]);
	});
});
