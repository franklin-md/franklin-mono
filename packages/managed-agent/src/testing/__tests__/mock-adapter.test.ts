import { describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '../../messages/event.js';
import { MockAdapter, MockedAgent } from '../mock-adapter.js';

function createHarness(
	options?: ConstructorParameters<typeof MockedAgent>[1],
): {
	events: ManagedAgentEvent[];
	mock: MockedAgent;
	adapter: MockAdapter;
} {
	const events: ManagedAgentEvent[] = [];
	const mock = new MockedAgent('agent-1', options);
	const adapter = new MockAdapter(
		{
			onEvent: (event) => events.push(event),
		},
		mock,
	);
	return { events, mock, adapter };
}

describe('MockAdapter', () => {
	it('records commands without emitting lifecycle events', async () => {
		const { events, adapter, mock } = createHarness();

		const result = await adapter.dispatch({ type: 'session.start', spec: {} });

		expect(result).toEqual({ ok: true });
		expect(mock.commands).toEqual([{ type: 'session.start', spec: {} }]);
		expect(events).toEqual([]);
	});

	it('supports imperative turn completion through MockedAgent helpers', async () => {
		const { events, adapter, mock } = createHarness();

		await adapter.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hello' }],
		});
		mock.completeTextTurn('done', { userText: 'hello' });

		expect(events).toEqual([
			{
				type: 'item.started',
				item: { kind: 'user_message', text: 'hello' },
			},
			{
				type: 'item.completed',
				item: { kind: 'user_message', text: 'hello' },
			},
			{
				type: 'item.started',
				item: { kind: 'assistant_message' },
			},
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'done' },
			},
			{ type: 'turn.completed' },
		]);
	});

	it('returns a disposed error after dispose', async () => {
		const { adapter } = createHarness();
		await adapter.dispose();

		const result = await adapter.dispatch({ type: 'session.start', spec: {} });

		expect(result).toEqual({
			ok: false,
			error: { code: 'DISPOSED', message: 'Adapter is disposed' },
		});
	});
});
