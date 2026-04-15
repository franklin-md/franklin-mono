import { describe, expect, it } from 'vitest';

import { map } from '../duplex/map.js';
import type { Duplex } from '../types.js';
import type { Codec } from '../../codec/types.js';

// A simple double/halve codec for testing
const doubleCodec: Codec<number, number> = {
	decode: (raw) => [raw * 2],
	encode: (typed) => typed / 2,
};

function createMemoryDuplex<T>(): {
	duplex: Duplex<T>;
	writer: WritableStreamDefaultWriter<T>;
	reader: ReadableStreamDefaultReader<T>;
} {
	const input = new TransformStream<T>();
	const output = new TransformStream<T>();

	const duplex: Duplex<T> = {
		readable: input.readable,
		writable: output.writable,
		dispose: async () => {},
	};

	return {
		duplex,
		// write raw values into the duplex's readable side
		writer: input.writable.getWriter(),
		// read raw values from the duplex's writable side
		reader: output.readable.getReader(),
	};
}

describe('map', () => {
	it('decodes values on the readable side', async () => {
		const { duplex, writer } = createMemoryDuplex<number>();
		const mapped = map(duplex, doubleCodec);
		const reader = mapped.readable.getReader();

		await writer.write(5);
		const { value } = await reader.read();

		expect(value).toBe(10); // 5 * 2

		reader.releaseLock();
		await writer.close();
	});

	it('encodes values on the writable side', async () => {
		const { duplex, reader } = createMemoryDuplex<number>();
		const mapped = map(duplex, doubleCodec);
		const mWriter = mapped.writable.getWriter();

		await mWriter.write(10);
		// Give the encode pump a tick
		await new Promise((r) => setTimeout(r, 0));
		const { value } = await reader.read();

		expect(value).toBe(5); // 10 / 2

		reader.releaseLock();
		await mWriter.close();
	});

	it('handles 1:N decode (one chunk → multiple values)', async () => {
		const multiCodec: Codec<string, number> = {
			decode: (raw) => raw.split(',').map(Number),
			encode: (typed) => String(typed),
		};

		const { duplex, writer } = createMemoryDuplex<string>();
		const mapped = map(duplex, multiCodec);
		const reader = mapped.readable.getReader();

		await writer.write('1,2,3');

		expect((await reader.read()).value).toBe(1);
		expect((await reader.read()).value).toBe(2);
		expect((await reader.read()).value).toBe(3);

		reader.releaseLock();
		await writer.close();
	});
});
