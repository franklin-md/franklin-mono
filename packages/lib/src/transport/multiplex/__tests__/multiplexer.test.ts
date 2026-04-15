import { describe, expect, it } from 'vitest';

import type { Duplex } from '../../streams/types.js';
import type { MuxPacket } from '../types.js';
import { Multiplexer } from '../multiplexer.js';

/** Creates a pair of connected Duplexes backed by TransformStreams. */
function createPair<T>(): { a: Duplex<T>; b: Duplex<T> } {
	const aToB = new TransformStream<T>();
	const bToA = new TransformStream<T>();

	return {
		a: {
			readable: bToA.readable,
			writable: aToB.writable,
			dispose: async () => {},
		},
		b: {
			readable: aToB.readable,
			writable: bToA.writable,
			dispose: async () => {},
		},
	};
}

describe('Multiplexer', () => {
	it('sends and receives on a single channel', async () => {
		const { a, b } = createPair<MuxPacket<string>>();
		const muxA = new Multiplexer(a);
		const muxB = new Multiplexer(b);

		const chanA = muxA.channel('ch1');
		const chanB = muxB.channel('ch1');

		const writer = chanA.writable.getWriter();
		const reader = chanB.readable.getReader();

		await writer.write('hello');
		await new Promise((r) => setTimeout(r, 0));

		const { value } = await reader.read();
		expect(value).toBe('hello');

		reader.releaseLock();
		writer.releaseLock();
	});

	it('isolates channels from each other', async () => {
		const { a, b } = createPair<MuxPacket<number>>();
		const muxA = new Multiplexer(a);
		const muxB = new Multiplexer(b);

		const chanA1 = muxA.channel('x');
		const chanA2 = muxA.channel('y');
		const chanB1 = muxB.channel('x');
		const chanB2 = muxB.channel('y');

		const writerX = chanA1.writable.getWriter();
		const writerY = chanA2.writable.getWriter();
		const readerX = chanB1.readable.getReader();
		const readerY = chanB2.readable.getReader();

		await writerX.write(1);
		await writerY.write(2);
		await new Promise((r) => setTimeout(r, 0));

		const resultX = await readerX.read();
		const resultY = await readerY.read();
		expect(resultX.value).toBe(1);
		expect(resultY.value).toBe(2);

		readerX.releaseLock();
		readerY.releaseLock();
		writerX.releaseLock();
		writerY.releaseLock();
	});

	it('supports two-level multiplexing', async () => {
		type Msg = { text: string };

		const { a, b } = createPair<MuxPacket<MuxPacket<Msg>>>();
		const level0A = new Multiplexer(a);
		const level0B = new Multiplexer(b);

		// Level 1: demux by transport name
		const level1A = new Multiplexer<Msg>(level0A.channel('agent-transport'));
		const level1B = new Multiplexer<Msg>(level0B.channel('agent-transport'));

		// Level 2: demux by agent id
		const agentA = level1A.channel('agent-abc');
		const agentB = level1B.channel('agent-abc');

		const writer = agentA.writable.getWriter();
		const reader = agentB.readable.getReader();

		await writer.write({ text: 'deep message' });
		await new Promise((r) => setTimeout(r, 0));

		const { value } = await reader.read();
		expect(value).toEqual({ text: 'deep message' });

		reader.releaseLock();
		writer.releaseLock();
	});

	it('closing a channel stops delivery', async () => {
		const { a, b } = createPair<MuxPacket<string>>();
		const muxA = new Multiplexer(a);
		const muxB = new Multiplexer(b);

		const chanA = muxA.channel('ch');
		const chanB = muxB.channel('ch');

		const received: string[] = [];
		const reader = chanB.readable.getReader();
		const readLoop = (async () => {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				received.push(value);
			}
		})();

		const writer = chanA.writable.getWriter();
		await writer.write('before');
		await new Promise((r) => setTimeout(r, 0));

		await chanB.dispose();
		await new Promise((r) => setTimeout(r, 0));

		expect(received).toEqual(['before']);
		await readLoop;
	});
});
