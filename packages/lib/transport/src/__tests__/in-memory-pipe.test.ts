import { describe, expect, it } from 'vitest';

import { createMemoryPipes } from '../in-memory/index.js';

describe('createMemoryPipes', () => {
	it('sends data from pipeA to pipeB', async () => {
		const { pipeA, pipeB, dispose } = createMemoryPipes();

		const writer = pipeA.writable.getWriter();
		const reader = pipeB.readable.getReader();

		const input = new TextEncoder().encode('hello from A');

		// Read and write concurrently to avoid backpressure deadlock
		const [, { value }] = await Promise.all([
			writer.write(input),
			reader.read(),
		]);

		expect(new TextDecoder().decode(value)).toBe('hello from A');

		reader.releaseLock();
		writer.releaseLock();
		await dispose();
	});

	it('sends data from pipeB to pipeA', async () => {
		const { pipeA, pipeB, dispose } = createMemoryPipes();

		const writer = pipeB.writable.getWriter();
		const reader = pipeA.readable.getReader();

		const input = new TextEncoder().encode('hello from B');

		const [, { value }] = await Promise.all([
			writer.write(input),
			reader.read(),
		]);

		expect(new TextDecoder().decode(value)).toBe('hello from B');

		reader.releaseLock();
		writer.releaseLock();
		await dispose();
	});

	it('dispose causes EOF on readers', async () => {
		const { pipeA, pipeB, dispose } = createMemoryPipes();

		const readerA = pipeA.readable.getReader();
		const readerB = pipeB.readable.getReader();

		await dispose();

		const resultA = await readerA.read();
		expect(resultA.done).toBe(true);

		const resultB = await readerB.read();
		expect(resultB.done).toBe(true);
	});
});
