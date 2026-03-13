import { describe, expect, it } from 'vitest';

import { connect } from '../connect.js';
import { createMemoryPipes } from '../in-memory/index.js';

/**
 * connect() wires two Pipes bidirectionally:
 *   a.readable → b.writable
 *   b.readable → a.writable
 *
 * We test by creating two independent MemoryPipePairs, then connecting
 * one end of each — bytes written into the "outer" end of pair1 should
 * arrive at the "outer" end of pair2, and vice versa.
 *
 *   writer → pair1.pipeA  ──connect──  pair2.pipeA → reader
 *            (inner end)                (inner end)
 */
function createTestHarness() {
	// pair1: we write to pipeA.writable, connect exposes pipeB
	const pair1 = createMemoryPipes();
	// pair2: connect exposes pipeA, we read from pipeB.readable
	const pair2 = createMemoryPipes();

	// Connect the "inner" ends: pair1.pipeB ↔ pair2.pipeA
	const connection = connect(pair1.pipeB, pair2.pipeA);

	return {
		// Write bytes into this end → they flow through the connection
		writerSide: pair1.pipeA,
		// Read bytes from this end ← they arrived through the connection
		readerSide: pair2.pipeB,
		connection,
		async cleanup() {
			await connection.dispose();
			await pair1.dispose();
			await pair2.dispose();
		},
	};
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe('connect', () => {
	it('pumps bytes from a.readable to b.writable', async () => {
		const { writerSide, readerSide, cleanup } = createTestHarness();

		const writer = writerSide.writable.getWriter();
		const reader = readerSide.readable.getReader();

		const [, { value }] = await Promise.all([
			writer.write(encoder.encode('hello')),
			reader.read(),
		]);

		expect(decoder.decode(value)).toBe('hello');

		reader.releaseLock();
		writer.releaseLock();
		await cleanup();
	});

	it('pumps bytes from b.readable to a.writable (reverse direction)', async () => {
		const pair1 = createMemoryPipes();
		const pair2 = createMemoryPipes();
		const connection = connect(pair1.pipeB, pair2.pipeA);

		// Write into pair2's outer end (pipeB.writable)
		const writer = pair2.pipeB.writable.getWriter();
		// Read from pair1's outer end (pipeA.readable)
		const reader = pair1.pipeA.readable.getReader();

		const [, { value }] = await Promise.all([
			writer.write(encoder.encode('reverse')),
			reader.read(),
		]);

		expect(decoder.decode(value)).toBe('reverse');

		reader.releaseLock();
		writer.releaseLock();
		await connection.dispose();
		await pair1.dispose();
		await pair2.dispose();
	});

	it('handles multiple chunks in sequence', async () => {
		const { writerSide, readerSide, cleanup } = createTestHarness();

		const writer = writerSide.writable.getWriter();
		const reader = readerSide.readable.getReader();

		await writer.write(encoder.encode('one'));
		const r1 = await reader.read();
		expect(decoder.decode(r1.value)).toBe('one');

		await writer.write(encoder.encode('two'));
		const r2 = await reader.read();
		expect(decoder.decode(r2.value)).toBe('two');

		await writer.write(encoder.encode('three'));
		const r3 = await reader.read();
		expect(decoder.decode(r3.value)).toBe('three');

		reader.releaseLock();
		writer.releaseLock();
		await cleanup();
	});

	it('dispose stops the pump', async () => {
		const pair1 = createMemoryPipes();
		const pair2 = createMemoryPipes();
		const connection = connect(pair1.pipeB, pair2.pipeA);

		await connection.dispose();

		// After dispose, the connected streams are aborted.
		// Writing to the source should not propagate.
		// The reader on pair2's outer end should see EOF or an error
		// because the connected writable (pair2.pipeA.writable) was aborted.
		const reader = pair2.pipeB.readable.getReader();
		const result = await reader.read();
		expect(result.done).toBe(true);

		reader.releaseLock();
		await pair1.dispose();
		await pair2.dispose();
	});

	it('dispose is idempotent', async () => {
		const pair1 = createMemoryPipes();
		const pair2 = createMemoryPipes();
		const connection = connect(pair1.pipeB, pair2.pipeA);

		await connection.dispose();
		await connection.dispose(); // should not throw

		await pair1.dispose();
		await pair2.dispose();
	});
});
