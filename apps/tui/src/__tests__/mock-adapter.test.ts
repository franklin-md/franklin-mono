import { describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '@franklin/managed-agent';

import { MockAdapter } from '../lib/mock-adapter.js';

function collectEvents(): {
	events: ManagedAgentEvent[];
	adapter: MockAdapter;
} {
	const events: ManagedAgentEvent[] = [];
	const adapter = new MockAdapter({
		onEvent: (e) => events.push(e),
	});
	return { events, adapter };
}

function waitFor(
	events: ManagedAgentEvent[],
	type: string,
	timeout = 2000,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Timed out waiting for ${type}`)),
			timeout,
		);
		const check = setInterval(() => {
			if (events.some((e) => e.type === type)) {
				clearTimeout(timer);
				clearInterval(check);
				resolve();
			}
		}, 10);
	});
}

describe('MockAdapter', () => {
	it('emits agent.ready and session.started on session.start', async () => {
		const { events, adapter } = collectEvents();
		const result = await adapter.dispatch({ type: 'session.start', spec: {} });

		expect(result).toEqual({ ok: true });
		await waitFor(events, 'session.started');

		const types = events.map((e) => e.type);
		expect(types).toContain('agent.ready');
		expect(types).toContain('session.started');
	});

	it('streams a response on turn.start', async () => {
		const { events, adapter } = collectEvents();
		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitFor(events, 'session.started');

		await adapter.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hello' }],
		});
		await waitFor(events, 'turn.completed');

		const types = events.map((e) => e.type);
		expect(types).toContain('item.started');
		expect(types).toContain('item.delta');
		expect(types).toContain('item.completed');
		expect(types).toContain('turn.started');
		expect(types).toContain('turn.completed');
	});

	it('returns error when disposed', async () => {
		const { adapter } = collectEvents();
		await adapter.dispose();

		const result = await adapter.dispatch({
			type: 'session.start',
			spec: {},
		});
		expect(result).toEqual({
			ok: false,
			error: { code: 'DISPOSED', message: 'Adapter is disposed' },
		});
	});

	it('handles unimplemented commands gracefully', async () => {
		const { adapter } = collectEvents();
		const result = await adapter.dispatch({ type: 'turn.interrupt' });
		expect(result).toEqual({ ok: true });
	});
});
