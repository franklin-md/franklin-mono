import { describe, expect, it } from 'vitest';

import { createDuplexPair } from '../in-memory/index.js';

describe('createDuplexPair', () => {
	it('sends data from a to b', async () => {
		const { a, b } = createDuplexPair<string>();

		const writer = a.writable.getWriter();
		const reader = b.readable.getReader();

		const [, { value }] = await Promise.all([
			writer.write('hello from a'),
			reader.read(),
		]);

		expect(value).toBe('hello from a');

		reader.releaseLock();
		writer.releaseLock();
	});

	it('sends data from b to a', async () => {
		const { a, b } = createDuplexPair<string>();

		const writer = b.writable.getWriter();
		const reader = a.readable.getReader();

		const [, { value }] = await Promise.all([
			writer.write('hello from b'),
			reader.read(),
		]);

		expect(value).toBe('hello from b');

		reader.releaseLock();
		writer.releaseLock();
	});

	it('does not lock streams', async () => {
		const { a, b } = createDuplexPair<number>();

		// Both sides should be freely lockable — no pipeTo has consumed them
		const writerA = a.writable.getWriter();
		const readerA = a.readable.getReader();
		const writerB = b.writable.getWriter();
		const readerB = b.readable.getReader();

		const [, { value: fromA }] = await Promise.all([
			writerA.write(42),
			readerB.read(),
		]);

		const [, { value: fromB }] = await Promise.all([
			writerB.write(99),
			readerA.read(),
		]);

		expect(fromA).toBe(42);
		expect(fromB).toBe(99);

		writerA.releaseLock();
		readerA.releaseLock();
		writerB.releaseLock();
		readerB.releaseLock();
	});

	it('close signals EOF on the other side', async () => {
		const { a, b } = createDuplexPair<string>();

		const reader = b.readable.getReader();

		await a.close();

		const result = await reader.read();
		expect(result.done).toBe(true);
	});

});
