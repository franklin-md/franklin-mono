import { describe, expect, it } from 'vitest';

import { callable } from '../writable/callable.js';

describe('callable', () => {
	it('writes values by calling the returned function', async () => {
		const stream = new TransformStream<string>();
		const send = callable(stream.writable);
		const reader = stream.readable.getReader();

		send('hello');
		send('world');

		const r1 = await reader.read();
		const r2 = await reader.read();

		expect(r1.value).toBe('hello');
		expect(r2.value).toBe('world');

		reader.releaseLock();
	});

	it('returns a fire-and-forget function', () => {
		const stream = new TransformStream<number>();
		const send = callable(stream.writable);

		// Should not return a promise — fire and forget
		send(42);
	});
});
