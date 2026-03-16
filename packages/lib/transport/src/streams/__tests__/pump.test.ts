import { describe, expect, it } from 'vitest';

import { pump } from '../readable/pump.js';

describe('pump', () => {
	it('calls fn for each value in the readable', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();

		const received: string[] = [];
		const done = pump(stream.readable, (v: string) => received.push(v));

		await writer.write('a');
		await writer.write('b');
		await writer.close();
		await done;

		expect(received).toEqual(['a', 'b']);
	});

	it('resolves when the readable closes', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();

		const done = pump(stream.readable, () => {});
		await writer.close();

		await expect(done).resolves.toBeUndefined();
	});

	it('resolves when the readable errors', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();

		const done = pump(stream.readable, () => {});
		await writer.abort(new Error('broken'));

		// pump should not reject — it swallows stream errors
		await expect(done).resolves.toBeUndefined();
	});

	it('handles an empty stream', async () => {
		const stream = new ReadableStream<string>({
			start(controller) {
				controller.close();
			},
		});

		const received: string[] = [];
		await pump(stream, (v) => received.push(v));

		expect(received).toEqual([]);
	});
});
