import type { Chunk, StreamEvent } from '@franklin/mini-acp';
import { textChunkStream, turn, turnEnd } from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';
import { runCoreScenario } from '../../../testing/index.js';

function chunks(events: readonly StreamEvent[]): Chunk[] {
	return events.filter((event): event is Chunk => event.type === 'chunk');
}

describe('core extension stream observers', () => {
	it('observes the same stream events that are returned to the caller', async () => {
		const observed: StreamEvent[] = [];

		const { events } = await runCoreScenario({
			turns: [turn([textChunkStream('ok'), turnEnd()])],
			extensions: [
				(api) => {
					api.on('turnStart', (event) => {
						observed.push(event);
					});
					api.on('chunk', (event) => {
						observed.push(event);
					});
					api.on('update', (event) => {
						observed.push(event);
					});
					api.on('turnEnd', (event) => {
						observed.push(event);
					});
				},
			],
		});

		expect(observed).toEqual(events);
	});

	it('runs multiple observers for the same stream event in registration order', async () => {
		const calls: string[] = [];

		await runCoreScenario({
			turns: [turn([textChunkStream('x'), turnEnd()])],
			extensions: [
				(api) => {
					api.on('chunk', () => {
						calls.push('first');
					});
					api.on('chunk', () => {
						calls.push('second');
					});
				},
			],
		});

		expect(calls).toEqual(['first', 'second']);
	});

	it('applies prompt handlers and stream observers in one turn', async () => {
		const observedChunks: Chunk[] = [];

		const { calls, events } = await runCoreScenario({
			turns: [turn([textChunkStream('response'), turnEnd()])],
			extensions: [
				(api) => {
					api.on('prompt', (prompt) => {
						prompt.appendContent(' [injected]');
					});
					api.on('chunk', (event) => {
						observedChunks.push(event);
					});
				},
			],
		});

		expect(calls.prompts[0]?.content).toHaveLength(1);
		expect(observedChunks).toEqual(chunks(events));
	});
});
