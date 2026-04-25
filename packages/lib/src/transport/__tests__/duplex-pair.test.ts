import { describe, expect, it } from 'vitest';

import { createDuplexPair } from '../in-memory/index.js';
import { callable } from '../streams/writable/callable.js';

async function readWithTimeout<T>(
	reader: ReadableStreamDefaultReader<T>,
): Promise<{ done: boolean; value?: T } | 'timeout'> {
	return await Promise.race([
		reader.read(),
		new Promise<'timeout'>((resolve) => {
			setTimeout(() => resolve('timeout'), 10);
		}),
	]);
}

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

	it('dispose signals EOF on the other side', async () => {
		const { a, b } = createDuplexPair<string>();

		const reader = b.readable.getReader();

		await a.dispose();

		const result = await reader.read();
		expect(result.done).toBe(true);
	});

	it('dispose succeeds while the writable is locked by a callable writer', async () => {
		const { a, b } = createDuplexPair<string>();
		const send = callable(a.writable);
		const reader = b.readable.getReader();

		send('hello');
		const first = await reader.read();
		expect(first.value).toBe('hello');

		await expect(a.dispose()).resolves.toBeUndefined();

		const result = await reader.read();
		expect(result.done).toBe(true);
	});

	it('dispose closes both directions of the pair', async () => {
		const { a, b } = createDuplexPair<string>();
		const aReader = a.readable.getReader();
		const bReader = b.readable.getReader();

		try {
			await a.dispose();

			expect(await readWithTimeout(aReader)).toEqual({
				done: true,
				value: undefined,
			});
			expect(await readWithTimeout(bReader)).toEqual({
				done: true,
				value: undefined,
			});
		} finally {
			aReader.releaseLock();
			bReader.releaseLock();
			await b.dispose().catch(() => {});
		}
	});
});
