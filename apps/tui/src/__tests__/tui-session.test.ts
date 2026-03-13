import { describe, expect, it, vi } from 'vitest';

import type { AgentStack } from '@franklin/agent';
import type { AgentSessionStore, ReactAgentSession } from '@franklin/react-agents';

import { TuiSession } from '../lib/tui-session.js';

function createStore(): AgentSessionStore {
	return {
		subscribe: () => () => {},
		getSnapshot: () => ({ transcript: [] }),
	};
}

function createSession(overrides?: Partial<AgentStack>): ReactAgentSession {
	return {
		stack: {
			prompt: vi.fn(async () => ({ stopReason: 'end_turn' as const })),
			dispose: vi.fn(async () => {}),
			...overrides,
		} as unknown as AgentStack,
		sessionId: 'test-session',
		store: createStore(),
	};
}

describe('TuiSession', () => {
	it('starts idle', () => {
		const session = new TuiSession('agent-1', createSession(), vi.fn());
		expect(session.status).toBe('idle');
	});

	it('sets running then idle around prompts', async () => {
		const onChange = vi.fn();
		const base = createSession();
		const session = new TuiSession('agent-1', base, onChange);

		await session.prompt('hello');

		expect(base.stack.prompt).toHaveBeenCalledWith({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});
		expect(session.status).toBe('idle');
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('sets error when prompt fails', async () => {
		const session = new TuiSession(
			'agent-1',
			createSession({
				prompt: vi.fn(async () => {
					throw new Error('prompt failed');
				}),
			}),
			vi.fn(),
		);

		await session.prompt('hello');

		expect(session.status).toBe('error');
	});

	it('disposes once and becomes disposed', async () => {
		const base = createSession();
		const session = new TuiSession('agent-1', base, vi.fn());

		await session.dispose();
		await session.dispose();

		expect(session.status).toBe('disposed');
		expect(base.stack.dispose).toHaveBeenCalledTimes(1);
	});
});
