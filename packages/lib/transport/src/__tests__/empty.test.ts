import { describe, expect, it } from 'vitest';

import { createEmptyStream } from '../empty.js';

describe('createEmptyStream', () => {
	it('discards writes and completes pending reads when closed', async () => {
		const stream = createEmptyStream<Uint8Array>();
		const writer = stream.writable.getWriter();
		const reader = stream.readable.getReader();

		const pendingRead = reader.read();
		const timeout = new Promise<'timeout'>((resolve) => {
			setTimeout(() => resolve('timeout'), 20);
		});

		await expect(
			writer.write(new Uint8Array([1, 2, 3])),
		).resolves.toBeUndefined();
		await expect(
			Promise.race([pendingRead.then(() => 'read' as const), timeout]),
		).resolves.toBe('timeout');

		await expect(stream.close()).resolves.toBeUndefined();
		await expect(pendingRead).resolves.toEqual({
			done: true,
			value: undefined,
		});
		await expect(stream.close()).resolves.toBeUndefined();

		reader.releaseLock();
		writer.releaseLock();
	});
});
