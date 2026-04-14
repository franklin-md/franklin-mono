import { describe, expect, it } from 'vitest';

import { emptyReadable } from '../readable/empty.js';
import { emptyWritable } from '../writable/empty.js';
import { emptyDuplex } from '../duplex/empty.js';

describe('emptyReadable', () => {
	it('produces a stream that is immediately done', async () => {
		const readable = emptyReadable<string>();
		const reader = readable.getReader();
		const { done } = await reader.read();
		expect(done).toBe(true);
	});
});

describe('emptyWritable', () => {
	it('accepts writes without error', async () => {
		const writable = emptyWritable<string>();
		const writer = writable.getWriter();
		await writer.write('ignored');
		await writer.close();
	});
});

describe('emptyDuplex', () => {
	it('readable is immediately done', async () => {
		const duplex = emptyDuplex<string>();
		const reader = duplex.readable.getReader();
		const { done } = await reader.read();
		expect(done).toBe(true);
	});

	it('writable accepts writes', async () => {
		const duplex = emptyDuplex<string>();
		const writer = duplex.writable.getWriter();
		await writer.write('ignored');
		await writer.close();
	});

	it('dispose is a no-op', async () => {
		const duplex = emptyDuplex<string>();
		await duplex.dispose();
	});
});
