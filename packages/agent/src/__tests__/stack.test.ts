import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	AgentSideConnection,
	PromptRequest,
	PromptResponse,
	RequestPermissionResponse,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { AgentSideConnection as AgentSideConnectionImpl } from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';
import type { AgentControl, AgentEvents, Middleware } from '../stack/index.js';
import { connect, sequence } from '../stack/index.js';

import { createMemoryTransport } from '../transport/in-memory.js';

import { createMockAgent } from './helpers.js';

/**
 * Sets up a composed stack with an in-memory transport.
 * Returns the stack, the agent-side connection (for agent-initiated calls),
 * and the mock agent. Initializes and creates a session automatically.
 */
function setup(middlewares: Middleware[], handler: Partial<AgentEvents>) {
	const { transport, agentStream } = createMemoryTransport();
	let agentConn: AgentSideConnection | undefined;
	const mockAgent = createMockAgent();

	void new AgentSideConnectionImpl((conn) => {
		agentConn = conn;
		return {
			initialize: (p) => mockAgent.initialize(p),
			newSession: (p) => mockAgent.newSession(p),
			prompt: (p) => mockAgent.prompt(p),
			cancel: (p) => mockAgent.cancel(p),
			authenticate: (p) => mockAgent.authenticate(p),
		};
	}, agentStream);

	const connection = new AgentConnection(transport);
	const stack = connect(connection, sequence(middlewares), handler);

	return {
		stack,
		connection,
		mockAgent,
		getAgentConn: () => {
			if (!agentConn) throw new Error('Agent connection not ready');
			return agentConn;
		},
	};
}

async function initAndSession(stack: AgentControl) {
	await stack.initialize({
		protocolVersion: PROTOCOL_VERSION,
		clientCapabilities: {},
	});
	await stack.newSession({ cwd: '/test', mcpServers: [] });
}

describe('compose', () => {
	const stacks: AgentControl[] = [];

	function tracked(middlewares: Middleware[], handler: Partial<AgentEvents>) {
		const result = setup(middlewares, handler);
		stacks.push(result.stack);
		return result;
	}

	afterEach(async () => {
		while (stacks.length > 0) {
			const s = stacks.pop();
			if (s) await s.dispose();
		}
	});

	it('outbound passthrough — no middleware', async () => {
		const { stack, mockAgent } = tracked([], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		await initAndSession(stack);
		const resp = await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(resp.stopReason).toBe('end_turn');
		expect(mockAgent.prompt).toHaveBeenCalled();
	});

	it('inbound passthrough — no middleware', async () => {
		const updates: SessionNotification[] = [];
		const { stack, mockAgent, getAgentConn } = tracked([], {
			sessionUpdate: async (p: SessionNotification) => {
				updates.push(p);
			},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				const ac = getAgentConn();
				await ac.sessionUpdate({
					sessionId: params.sessionId,
					update: {
						sessionUpdate: 'agent_message_chunk',
						content: { type: 'text', text: 'hello' },
					},
				});
				return { stopReason: 'end_turn' as const };
			},
		);

		await initAndSession(stack);
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'test' }],
		});

		expect(updates.length).toBeGreaterThanOrEqual(1);
	});

	it('outbound interception — middleware modifies prompt params', async () => {
		const capturedParams: PromptRequest[] = [];

		const addPrefix: Middleware = {
			prompt: async (params, next) => {
				const firstItem = params.prompt[0];
				const text = firstItem && 'text' in firstItem ? firstItem.text : '';
				const modified: PromptRequest = {
					...params,
					prompt: [{ type: 'text', text: `[PREFIX] ${text}` }],
				};
				return next(modified);
			},
		};

		const { stack, mockAgent } = tracked([addPrefix], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				capturedParams.push(params);
				return { stopReason: 'end_turn' as const };
			},
		);

		await initAndSession(stack);
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'original' }],
		});

		expect(capturedParams).toHaveLength(1);
		const received = capturedParams[0]!.prompt[0];
		expect(received && 'text' in received ? received.text : '').toBe(
			'[PREFIX] original',
		);
	});

	it('inbound interception — middleware short-circuits requestPermission', async () => {
		const autoApprove: Middleware = {
			requestPermission: async (_params, _next) => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		};

		const appPermissionCalled = vi.fn();
		const { stack, mockAgent, getAgentConn } = tracked([autoApprove], {
			sessionUpdate: async () => {},
			requestPermission: async () => {
				appPermissionCalled();
				return {
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				};
			},
		});

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				const ac = getAgentConn();
				const decision = (await ac.requestPermission({
					sessionId: params.sessionId,
					toolCall: {
						title: 'test',
						kind: 'execute',
						status: 'pending',
						toolCallId: 'tc-1',
						content: [
							{ type: 'content', content: { type: 'text', text: 'ls' } },
						],
					},
					options: [{ kind: 'allow_once', name: 'Allow', optionId: 'allow' }],
				})) as RequestPermissionResponse;
				expect(decision.outcome.outcome).toBe('selected');
				return { stopReason: 'end_turn' as const };
			},
		);

		await initAndSession(stack);
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'do something' }],
		});

		// The app handler should NOT have been called — middleware short-circuited
		expect(appPermissionCalled).not.toHaveBeenCalled();
	});

	it('onion ordering — before/after next() execute in correct order', async () => {
		const log: string[] = [];

		const outer: Middleware = {
			prompt: async (params, next) => {
				log.push('outer-before');
				const result = await next(params);
				log.push('outer-after');
				return result;
			},
		};

		const inner: Middleware = {
			prompt: async (params, next) => {
				log.push('inner-before');
				const result = await next(params);
				log.push('inner-after');
				return result;
			},
		};

		const { stack } = tracked([outer, inner], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		await initAndSession(stack);
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'test' }],
		});

		expect(log).toEqual([
			'outer-before',
			'inner-before',
			'inner-after',
			'outer-after',
		]);
	});

	it('multiple middlewares with ordered side effects', async () => {
		const log: string[] = [];

		const mw = (name: string): Middleware => ({
			prompt: async (params, next) => {
				log.push(`${name}-down`);
				const result = await next(params);
				log.push(`${name}-up`);
				return result;
			},
			sessionUpdate: async (params, next) => {
				log.push(`${name}-inbound`);
				return next(params);
			},
		});

		const { stack, mockAgent, getAgentConn } = tracked(
			[mw('A'), mw('B'), mw('C')],
			{
				sessionUpdate: async () => {
					log.push('handler-inbound');
				},
				requestPermission: async () => ({
					outcome: { outcome: 'selected' as const, optionId: 'allow' },
				}),
			},
		);

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				log.push('agent-prompt');
				const ac = getAgentConn();
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

		await initAndSession(stack);
		await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'test' }],
		});

		// Outbound: A-down → B-down → C-down → agent-prompt
		// Inbound (during prompt): A-inbound → B-inbound → C-inbound → handler-inbound
		//   (same order as outbound — compose no longer reverses inbound)
		// Outbound return: C-up → B-up → A-up
		expect(log).toEqual([
			'A-down',
			'B-down',
			'C-down',
			'agent-prompt',
			'A-inbound',
			'B-inbound',
			'C-inbound',
			'handler-inbound',
			'C-up',
			'B-up',
			'A-up',
		]);
	});

	it('partial middleware — only overrides prompt, others pass through', async () => {
		const promptOnly: Middleware = {
			prompt: async (params, next) => {
				// Just add a tag, forward everything
				return next(params);
			},
		};

		const { stack, mockAgent } = tracked([promptOnly], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		// initialize and newSession should pass through unaffected
		const initResp = await stack.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		expect(initResp.protocolVersion).toBe(PROTOCOL_VERSION);

		const sessionResp = await stack.newSession({
			cwd: '/test',
			mcpServers: [],
		});
		expect(sessionResp.sessionId).toBe('test-session');

		expect(mockAgent.initialize).toHaveBeenCalled();
		expect(mockAgent.newSession).toHaveBeenCalled();
	});

	it('optional inbound method not implemented — throws methodNotFound', async () => {
		const { stack, mockAgent, getAgentConn } = tracked([], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
			// No writeTextFile handler
		});

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async () => {
				const ac = getAgentConn();
				try {
					await ac.writeTextFile({
						path: '/test.txt',
						content: 'hello',
						sessionId: 'test-session',
					});
				} catch (err: unknown) {
					const reqErr = err as { code: number };
					if (reqErr.code === -32601) {
						return { stopReason: 'end_turn' as const };
					}
					throw err;
				}
				throw new Error('Expected method not found error');
			},
		);

		await initAndSession(stack);
		const resp = await stack.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'write file' }],
		});
		expect(resp.stopReason).toBe('end_turn');
	});

	it('dispose chains through middlewares then connection', async () => {
		const log: string[] = [];

		const mw: Middleware = {
			dispose: async (_params, next) => {
				log.push('mw-dispose');
				return next(_params);
			},
		};

		const { stack } = setup([mw], {
			sessionUpdate: async () => {},
			requestPermission: async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			}),
		});

		await stack.dispose();
		log.push('done');

		expect(log).toEqual(['mw-dispose', 'done']);
		// Don't track this one — already disposed
	});
});
