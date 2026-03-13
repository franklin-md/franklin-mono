import { describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '@franklin/managed-agent';
import { MockedAgent } from '@franklin/managed-agent/testing';

import { createMockAgentManager } from '../mock-agent-manager.js';

describe('createMockAgentManager', () => {
	it('returns a real AgentManager backed by MockedAgent instances', async () => {
		const { manager, mocks } = createMockAgentManager();

		const handle = await manager.create('a1', {
			adapterKind: 'mock',
			sessionSpec: {},
		});
		const result = await handle.dispatch({ type: 'session.start', spec: {} });

		expect(result).toEqual({ ok: true });
		// Status transitions are now command-driven
		expect(handle.status).toBe('ready');
		expect(mocks.get('a1').commands).toEqual([
			{ type: 'session.start', spec: {} },
		]);
	});

	it('lets tests drive events imperatively through the registry', async () => {
		const { manager, mocks } = createMockAgentManager();
		const events: ManagedAgentEvent[] = [];

		const handle = await manager.create('a1', {
			adapterKind: 'mock',
			sessionSpec: {},
		});
		handle.on((event) => events.push(event));

		await handle.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hello' }],
		});
		mocks.get('a1').completeTextTurn('done', { userText: 'hello' });

		expect(handle.status).toBe('idle');
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

	it('supports custom MockedAgent creation', async () => {
		const { manager } = createMockAgentManager({
			createMockedAgent: ({ agentId }) => {
				const mock = new MockedAgent(agentId);
				mock.setCommandHandler((command, agent) => {
					if (command.type === 'turn.start') {
						agent.completeTextTurn('auto reply');
					}
				});
				return mock;
			},
		});
		const events: ManagedAgentEvent[] = [];

		const handle = await manager.create('a1', {
			adapterKind: 'mock',
			sessionSpec: {},
		});
		handle.on((event) => events.push(event));

		const result = await handle.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hello' }],
		});

		expect(result).toEqual({ ok: true });
		expect(events).toEqual([
			{
				type: 'item.started',
				item: { kind: 'assistant_message' },
			},
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'auto reply' },
			},
			{ type: 'turn.completed' },
		]);
	});

	it('rejects non-mock adapter kinds', async () => {
		const { manager } = createMockAgentManager();

		await expect(
			manager.create('a1', {
				adapterKind: 'codex',
				sessionSpec: {},
			}),
		).rejects.toThrow(
			'createMockAgentManager only supports adapter kind "mock" (got "codex")',
		);
	});
});
