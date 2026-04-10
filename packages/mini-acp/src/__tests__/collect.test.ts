import { describe, expect, it } from 'vitest';
import { collect } from '../utils/collect.js';
import { StopCode } from '../types/stop-code.js';
import type { StreamEvent } from '../types/stream.js';

async function* stream(events: StreamEvent[]): AsyncGenerator<StreamEvent> {
	for (const event of events) yield event;
}

describe('collect', () => {
	it('returns every update message and the turn end', async () => {
		const events: StreamEvent[] = [
			{ type: 'turnStart' },
			{
				type: 'chunk',
				messageId: 'm1',
				role: 'assistant',
				content: { type: 'text', text: 'one' },
			},
			{
				type: 'update',
				messageId: 'm1',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'one' }],
				},
			},
			{
				type: 'update',
				messageId: 'm2',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'two' }],
				},
			},
			{ type: 'turnEnd', stopCode: StopCode.Completed },
		];

		const result = await collect(stream(events));

		expect(result.messages).toEqual([
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'one' }],
			},
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'two' }],
			},
		]);
		expect(result.turnEnd).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.Completed,
		});
	});
});
