import { describe, expect, it } from 'vitest';

import { fromCallable } from '../writable/from-callable.js';

describe('fromCallable', () => {
	it('calls the function for each write', async () => {
		const received: string[] = [];
		const writable = fromCallable<string>((v) => received.push(v));
		const writer = writable.getWriter();

		await writer.write('a');
		await writer.write('b');

		expect(received).toEqual(['a', 'b']);

		await writer.close();
	});

	it('creates a standard writable stream', async () => {
		const writable = fromCallable<number>(() => {});
		expect(writable).toBeInstanceOf(WritableStream);
	});
});
