import { afterEach, describe, expect, it } from 'vitest';

import { StdioPipe } from '../stdio/index.js';

describe('StdioPipe', () => {
	const pipes: StdioPipe[] = [];

	afterEach(async () => {
		while (pipes.length > 0) {
			const p = pipes.pop();
			if (p) await p.close();
		}
	});

	it('spawns a subprocess and exposes a pipe', () => {
		const p = new StdioPipe({ command: 'cat' });
		pipes.push(p);

		expect(p.readable).toBeDefined();
		expect(p.writable).toBeDefined();
	});

	it('dispose kills the subprocess', async () => {
		const p = new StdioPipe({ command: 'cat' });
		await p.close();
		// Calling dispose again is a no-op
		await p.close();
	});

	it('round-trips bytes through cat', async () => {
		const p = new StdioPipe({ command: 'cat' });
		pipes.push(p);

		const writer = p.writable.getWriter();
		const reader = p.readable.getReader();

		const input = new TextEncoder().encode('hello world\n');
		await writer.write(input);

		const { value } = await reader.read();
		expect(new TextDecoder().decode(value)).toBe('hello world\n');

		reader.releaseLock();
		writer.releaseLock();
	});
});
