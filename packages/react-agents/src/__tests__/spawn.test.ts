import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';
import { AgentSideConnection } from '@agentclientprotocol/sdk';
import type { SessionNotification } from '@franklin/agent';
import { AgentConnection } from '@franklin/agent';

import { createMemoryTransport } from '../../../agent/src/transport/in-memory.js';
import { createMockAgent } from '../../../agent/src/__tests__/helpers.js';
import { spawnFromConnection } from '../spawn.js';

function setup() {
	const { transport, agentStream } = createMemoryTransport();
	const mockAgent = createMockAgent();

	void new AgentSideConnection((conn) => {
		mockAgent.conn = conn;
		return {
			initialize: (p) => mockAgent.initialize(p),
			newSession: (p) => mockAgent.newSession(p),
			prompt: (p) => mockAgent.prompt(p),
			cancel: (p) => mockAgent.cancel(p),
			authenticate: (p) => mockAgent.authenticate(p),
		};
	}, agentStream);

	const connection = new AgentConnection(transport);
	return { connection, mockAgent };
}

describe('react-agents spawnFromConnection', () => {
	const stacks: Array<{ dispose(): Promise<void> }> = [];

	afterEach(async () => {
		while (stacks.length > 0) {
			const stack = stacks.pop();
			if (stack) await stack.dispose();
		}
	});

	it('returns a session with a store', async () => {
		const { connection } = setup();

		const session = await spawnFromConnection(connection, {
			cwd: '/test',
		});
		stacks.push(session.stack);

		expect(session.sessionId).toBe('test-session');
		expect(session.store.getSnapshot()).toEqual({ transcript: [] });
	});

	it('captures inbound updates in the session store transcript', async () => {
		const { connection, mockAgent } = setup();
		let capturedPrompt: PromptRequest | undefined;

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedPrompt = params;
				const ac = mockAgent.conn!;
				await ac.sessionUpdate({
					sessionId: params.sessionId,
					update: {
						sessionUpdate: 'agent_message_chunk',
						content: { type: 'text', text: 'hi' },
					},
				});
				return { stopReason: 'end_turn' as const };
			},
		);

		const session = await spawnFromConnection(connection, {
			cwd: '/test',
		});
		stacks.push(session.stack);

		await session.stack.prompt({
			sessionId: session.sessionId,
			prompt: [{ type: 'text', text: 'test' }],
		});

		const transcript = session.store.getSnapshot().transcript;
		expect(capturedPrompt?.messageId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(transcript).toHaveLength(2);
		expect(transcript[0]?.notification).toMatchObject({
			sessionId: 'test-session',
			update: {
				sessionUpdate: 'user_message_chunk',
				messageId: capturedPrompt?.messageId,
				content: { type: 'text', text: 'test' },
			},
		});
		expect(transcript[1]?.notification).toEqual({
			sessionId: 'test-session',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} satisfies SessionNotification);
	});
});
