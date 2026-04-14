import { describe, expect, it } from 'vitest';

import { bridge } from '../duplex/bridge.js';

describe('bridge', () => {
	it('handler call appears on the readable side', async () => {
		const { handler, duplex } = bridge<string, string>();
		const reader = duplex.readable.getReader();

		// Call but don't await — the response hasn't come yet
		const response = handler('hello');
		const { value } = await reader.read();

		expect(value).toEqual({ id: 'req-0', body: 'hello' });

		// Resolve the pending request
		const writer = duplex.writable.getWriter();
		await writer.write({ id: 'req-0', result: 'world' });

		await expect(response).resolves.toBe('world');

		reader.releaseLock();
		writer.releaseLock();
		await duplex.dispose();
	});

	it('correlates multiple concurrent requests', async () => {
		const { handler, duplex } = bridge<string, number>();
		const reader = duplex.readable.getReader();

		const r1 = handler('first');
		const r2 = handler('second');

		const msg1 = await reader.read();
		const msg2 = await reader.read();

		expect(msg1.value?.id).toBe('req-0');
		expect(msg2.value?.id).toBe('req-1');

		// Respond out of order
		const writer = duplex.writable.getWriter();
		await writer.write({ id: 'req-1', result: 2 });
		await writer.write({ id: 'req-0', result: 1 });

		await expect(r1).resolves.toBe(1);
		await expect(r2).resolves.toBe(2);

		reader.releaseLock();
		writer.releaseLock();
		await duplex.dispose();
	});

	it('handler rejects when an error response arrives', async () => {
		const { handler, duplex } = bridge<string, string>();
		const reader = duplex.readable.getReader();

		const response = handler('fail');
		await reader.read();

		const writer = duplex.writable.getWriter();
		await writer.write({ id: 'req-0', error: 'something broke' });

		await expect(response).rejects.toThrow('something broke');

		reader.releaseLock();
		writer.releaseLock();
		await duplex.dispose();
	});

	it('dispose rejects all pending requests', async () => {
		const { handler, duplex } = bridge<string, string>();

		const response = handler('orphan');
		await duplex.dispose();

		await expect(response).rejects.toThrow('Bridge disposed');
	});
});
