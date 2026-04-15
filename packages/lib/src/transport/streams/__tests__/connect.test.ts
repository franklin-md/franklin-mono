import { describe, expect, it } from 'vitest';

import { connect } from '../duplex/connect.js';
import type { Duplex } from '../types.js';

/**
 * Creates a test duplex where the readable and writable are backed
 * by independent TransformStreams, so we can push/pull from outside.
 */
function createTestDuplex<R, W = R>() {
	const readSide = new TransformStream<R>();
	const writeSide = new TransformStream<W>();

	const duplex: Duplex<R, W> = {
		readable: readSide.readable,
		writable: writeSide.writable,
		dispose: async () => {},
	};

	return {
		duplex,
		// Push data into the duplex's readable (external → connect)
		push: readSide.writable.getWriter(),
		// Pull data from the duplex's writable (connect → external)
		pull: writeSide.readable.getReader(),
	};
}

describe('connect', () => {
	it('pipes a.readable → b.writable', async () => {
		const a = createTestDuplex<string, number>();
		const b = createTestDuplex<number, string>();
		const connection = connect(a.duplex, b.duplex);

		await a.push.write('hello');
		const { value } = await b.pull.read();

		expect(value).toBe('hello');

		a.push.releaseLock();
		b.pull.releaseLock();
		await connection.dispose();
	});

	it('pipes b.readable → a.writable', async () => {
		const a = createTestDuplex<string, number>();
		const b = createTestDuplex<number, string>();
		const connection = connect(a.duplex, b.duplex);

		await b.push.write(42);
		const { value } = await a.pull.read();

		expect(value).toBe(42);

		b.push.releaseLock();
		a.pull.releaseLock();
		await connection.dispose();
	});

	it('dispose stops the pump', async () => {
		const a = createTestDuplex<string, number>();
		const b = createTestDuplex<number, string>();
		const connection = connect(a.duplex, b.duplex);

		await connection.dispose();

		// After dispose, writing to a should not propagate to b.
		// The pull reader may see done or an error depending on abort timing.
		const result = await b.pull
			.read()
			.catch(() => ({ done: true, value: undefined }));
		expect(result.done).toBe(true);

		b.pull.releaseLock();
	});

	it('dispose is idempotent', async () => {
		const a = createTestDuplex<string>();
		const b = createTestDuplex<string>();
		const connection = connect(a.duplex, b.duplex);

		await connection.dispose();
		await connection.dispose();
	});
});
