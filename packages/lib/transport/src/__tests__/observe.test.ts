import { describe, expect, it } from 'vitest';

import { observe } from '../streams/observe.js';

/**
 * observe() takes a ReadableStream and returns an Observer that fans out
 * each value to all registered subscribers. The readable is consumed by
 * an internal pump — callers interact via subscribe/unsubscribe callbacks.
 */
describe('observe', () => {
	it('delivers values to a single subscriber', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();
		const { subscribe } = observe<string>(stream.readable);

		const received: string[] = [];
		subscribe((v) => received.push(v));

		await writer.write('a');
		await writer.write('b');
		// Give the pump microtask a tick to deliver
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['a', 'b']);

		await writer.close();
	});

	it('fans out to multiple subscribers', async () => {
		const stream = new TransformStream<number>();
		const writer = stream.writable.getWriter();
		const { subscribe } = observe<number>(stream.readable);

		const first: number[] = [];
		const second: number[] = [];
		subscribe((v) => first.push(v));
		subscribe((v) => second.push(v));

		await writer.write(1);
		await writer.write(2);
		await new Promise((r) => setTimeout(r, 0));

		expect(first).toEqual([1, 2]);
		expect(second).toEqual([1, 2]);

		await writer.close();
	});

	it('unsubscribe stops delivery to that listener', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();
		const { subscribe } = observe<string>(stream.readable);

		const received: string[] = [];
		const unsubscribe = subscribe((v) => received.push(v));

		await writer.write('before');
		await new Promise((r) => setTimeout(r, 0));

		unsubscribe();

		await writer.write('after');
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['before']);

		await writer.close();
	});

	it('does not break when stream closes', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();
		const { subscribe } = observe<string>(stream.readable);

		const received: string[] = [];
		subscribe((v) => received.push(v));

		await writer.write('value');
		await writer.close();
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['value']);
	});

	it('subscribers added after values are written only see future values', async () => {
		const stream = new TransformStream<string>();
		const writer = stream.writable.getWriter();
		const { subscribe } = observe<string>(stream.readable);

		await writer.write('early');
		await new Promise((r) => setTimeout(r, 0));

		const late: string[] = [];
		subscribe((v) => late.push(v));

		await writer.write('later');
		await new Promise((r) => setTimeout(r, 0));

		expect(late).toEqual(['later']);

		await writer.close();
	});
});
