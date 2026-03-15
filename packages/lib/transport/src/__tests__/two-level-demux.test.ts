import { describe, expect, it } from 'vitest';

import { createMultiplexedEventStream } from '../event-driven/mutliplexed.js';
import type { EventInterface } from '../event-driven/single.js';
import { streamToEventInterface } from '../event-driven/stream-to-event.js';
import type { IdPacket } from '../event-driven/mutliplexed.js';

/**
 * Tests the two-level demux pattern used for IPC agent transport:
 *
 *   Level 1: shared channel (e.g. "agent-transport") carrying IdPacket<Msg>
 *   Level 2: per-agent demux by agentId, yielding Stream<Msg>
 *
 * Simulates both sides (renderer + main) using in-memory EventInterfaces
 * instead of actual Electron IPC.
 */
describe('two-level demux', () => {
	/** Simulates a bidirectional IPC channel using in-memory callbacks. */
	function createMockIpc<T>(): {
		rendererSide: EventInterface<T>;
		mainSide: EventInterface<T>;
	} {
		const rendererListeners = new Set<(data: T) => void>();
		const mainListeners = new Set<(data: T) => void>();

		return {
			rendererSide: {
				on: (cb: (data: T) => void) => {
					rendererListeners.add(cb);
					return () => rendererListeners.delete(cb);
				},
				invoke: (data: T) => {
					// renderer → main
					for (const listener of mainListeners) {
						listener(data);
					}
				},
			},
			mainSide: {
				on: (cb: (data: T) => void) => {
					mainListeners.add(cb);
					return () => mainListeners.delete(cb);
				},
				invoke: (data: T) => {
					// main → renderer
					for (const listener of rendererListeners) {
						listener(data);
					}
				},
			},
		};
	}

	it('messages flow renderer → main through two demux levels', async () => {
		type Msg = { text: string };
		const ipc = createMockIpc<IdPacket<IdPacket<Msg>>>();

		// Level 1: both sides demux on channel name "agent-transport"
		const rendererL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.rendererSide,
		);
		const mainL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.mainSide,
		);

		// Level 2: demux by agentId
		const rendererMux = streamToEventInterface<IdPacket<Msg>>(rendererL1);
		const mainMux = streamToEventInterface<IdPacket<Msg>>(mainL1);

		const agentId = 'agent-abc';
		const rendererAgent = createMultiplexedEventStream<Msg>(
			agentId,
			rendererMux,
		);
		const mainAgent = createMultiplexedEventStream<Msg>(agentId, mainMux);

		// Write from renderer side
		const writer = rendererAgent.writable.getWriter();
		const reader = mainAgent.readable.getReader();

		await writer.write({ text: 'hello from renderer' });
		await new Promise((r) => setTimeout(r, 0));

		const { value } = await reader.read();
		expect(value).toEqual({ text: 'hello from renderer' });

		reader.releaseLock();
		writer.releaseLock();
	});

	it('messages flow main → renderer through two demux levels', async () => {
		type Msg = { text: string };
		const ipc = createMockIpc<IdPacket<IdPacket<Msg>>>();

		const rendererL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.rendererSide,
		);
		const mainL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.mainSide,
		);

		const rendererMux = streamToEventInterface<IdPacket<Msg>>(rendererL1);
		const mainMux = streamToEventInterface<IdPacket<Msg>>(mainL1);

		const agentId = 'agent-xyz';
		const rendererAgent = createMultiplexedEventStream<Msg>(
			agentId,
			rendererMux,
		);
		const mainAgent = createMultiplexedEventStream<Msg>(agentId, mainMux);

		// Write from main side
		const writer = mainAgent.writable.getWriter();
		const reader = rendererAgent.readable.getReader();

		await writer.write({ text: 'hello from main' });
		await new Promise((r) => setTimeout(r, 0));

		const { value } = await reader.read();
		expect(value).toEqual({ text: 'hello from main' });

		reader.releaseLock();
		writer.releaseLock();
	});

	it('multiple agents are isolated from each other', async () => {
		type Msg = { n: number };
		const ipc = createMockIpc<IdPacket<IdPacket<Msg>>>();

		const rendererL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.rendererSide,
		);
		const mainL1 = createMultiplexedEventStream<IdPacket<Msg>>(
			'agent-transport',
			ipc.mainSide,
		);

		const rendererMux = streamToEventInterface<IdPacket<Msg>>(rendererL1);
		const mainMux = streamToEventInterface<IdPacket<Msg>>(mainL1);

		// Two agents
		const rendererA = createMultiplexedEventStream<Msg>('a', rendererMux);
		const rendererB = createMultiplexedEventStream<Msg>('b', rendererMux);
		const mainA = createMultiplexedEventStream<Msg>('a', mainMux);
		const mainB = createMultiplexedEventStream<Msg>('b', mainMux);

		const readerA = mainA.readable.getReader();
		const readerB = mainB.readable.getReader();

		// Write to agent A only
		const writerA = rendererA.writable.getWriter();
		await writerA.write({ n: 1 });
		await new Promise((r) => setTimeout(r, 0));

		const resultA = await readerA.read();
		expect(resultA.value).toEqual({ n: 1 });

		// Write to agent B only
		const writerB = rendererB.writable.getWriter();
		await writerB.write({ n: 2 });
		await new Promise((r) => setTimeout(r, 0));

		const resultB = await readerB.read();
		expect(resultB.value).toEqual({ n: 2 });

		// Agent B should NOT have received agent A's message.
		// If we could race-check, we'd verify readerB has no queued data.
		// Instead, verify a second write to A arrives correctly at A.
		await writerA.write({ n: 3 });
		await new Promise((r) => setTimeout(r, 0));

		const resultA2 = await readerA.read();
		expect(resultA2.value).toEqual({ n: 3 });

		readerA.releaseLock();
		readerB.releaseLock();
		writerA.releaseLock();
		writerB.releaseLock();
	});
});
