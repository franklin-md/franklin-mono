import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';
import { AgentSideConnection } from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';
import { AgentRegistry } from '../registry.js';
import { spawnFromConnection } from '../spawn.js';
import type { AgentStack } from '../stack.js';

import { createMemoryTransport } from '../transport/in-memory.js';

import { createMockAgent } from './helpers.js';

/**
 * Sets up an in-memory agent connection + agent-side connection.
 * Returns the connection and mock agent for verification.
 */
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

describe('spawnFromConnection', () => {
	const stacks: AgentStack[] = [];

	afterEach(async () => {
		while (stacks.length > 0) {
			const s = stacks.pop();
			if (s) await s.dispose();
		}
	});

	it('initializes and creates a session', async () => {
		const { connection, mockAgent } = setup();

		const result = await spawnFromConnection(connection, {
			cwd: '/test',
			handler: {
				sessionUpdate: async () => {},
				requestPermission: async () => ({
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				}),
			},
		});
		stacks.push(result.stack);

		expect(mockAgent.initialize).toHaveBeenCalled();
		expect(mockAgent.newSession).toHaveBeenCalled();
		expect(result.sessionId).toBe('test-session');
		expect(result.stack).toBeDefined();
		expect('connection' in result).toBe(false);
	});

	it('the returned stack is functional for prompts', async () => {
		const { connection, mockAgent } = setup();

		const result = await spawnFromConnection(connection, {
			cwd: '/test',
			handler: {
				sessionUpdate: async () => {},
				requestPermission: async () => ({
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				}),
			},
		});
		stacks.push(result.stack);

		const resp = await result.stack.prompt({
			sessionId: result.sessionId,
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(resp.stopReason).toBe('end_turn');
		expect(mockAgent.prompt).toHaveBeenCalled();
	});

	it('applies middlewares to the stack', async () => {
		const { connection } = setup();
		const log: string[] = [];

		const result = await spawnFromConnection(connection, {
			cwd: '/test',
			middlewares: [
				{
					prompt: async (params, next) => {
						log.push('mw-before');
						const r = await next(params);
						log.push('mw-after');
						return r;
					},
				},
			],
			handler: {
				sessionUpdate: async () => {},
				requestPermission: async () => ({
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				}),
			},
		});
		stacks.push(result.stack);

		await result.stack.prompt({
			sessionId: result.sessionId,
			prompt: [{ type: 'text', text: 'test' }],
		});

		expect(log).toEqual(['mw-before', 'mw-after']);
	});

	it('receives inbound session updates', async () => {
		const { connection, mockAgent } = setup();
		const updates: unknown[] = [];

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
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

		const result = await spawnFromConnection(connection, {
			cwd: '/test',
			handler: {
				sessionUpdate: async (p) => {
					updates.push(p);
				},
				requestPermission: async () => ({
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				}),
			},
		});
		stacks.push(result.stack);

		await result.stack.prompt({
			sessionId: result.sessionId,
			prompt: [{ type: 'text', text: 'test' }],
		});

		expect(updates.length).toBeGreaterThanOrEqual(1);
	});
});

describe('AgentRegistry + spawn integration', () => {
	it('registry resolves agent specs', () => {
		const registry = new AgentRegistry();
		registry.register('test-agent', {
			command: 'some-binary',
			args: ['--acp'],
		});

		const spec = registry.get('test-agent');
		expect(spec.command).toBe('some-binary');
		expect(spec.args).toEqual(['--acp']);
	});
});
