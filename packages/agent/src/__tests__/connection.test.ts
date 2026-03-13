import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	AgentSideConnection,
	Client,
	PromptRequest,
	PromptResponse,
	RequestPermissionResponse,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { AgentSideConnection as AgentSideConnectionImpl } from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';

import {
	createMockClient,
	createMemoryTransport,
	createMockAgent,
	createTestPair,
} from './helpers.js';

describe('AgentConnection', () => {
	const connections: AgentConnection[] = [];

	function create(agentOverrides?: Parameters<typeof createTestPair>[0]) {
		const {
			transport,
			agentConn: _agentConn,
			mockAgent,
		} = createTestPair(agentOverrides);
		const handler = createMockClient();
		const conn = new AgentConnection(transport, handler);
		connections.push(conn);
		return { conn, handler, mockAgent, transport };
	}

	/**
	 * Creates a test pair where the agent-side connection is captured for
	 * agent-initiated calls (sessionUpdate, requestPermission, etc.).
	 */
	function createWithAgentConn() {
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

		const handler = createMockClient();
		const conn = new AgentConnection(transport, handler);
		connections.push(conn);

		return {
			conn,
			handler,
			mockAgent,
			getAgentConn: () => {
				if (!agentConn) throw new Error('Agent connection not ready');
				return agentConn;
			},
		};
	}

	afterEach(async () => {
		while (connections.length > 0) {
			const conn = connections.pop();
			if (conn) await conn.dispose();
		}
	});

	it('initialize + new session round-trip', async () => {
		const { conn } = create();

		const initResp = await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		expect(initResp.protocolVersion).toBe(PROTOCOL_VERSION);

		const sessionResp = await conn.newSession({
			cwd: '/test',
			mcpServers: [],
		});
		expect(sessionResp.sessionId).toBe('test-session');
	});

	it('prompt round-trip', async () => {
		const { conn } = create();

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await conn.newSession({ cwd: '/test', mcpServers: [] });

		const resp = await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'hello' }],
		});
		expect(resp.stopReason).toBe('end_turn');
	});

	it('inbound sessionUpdate reaches handler', async () => {
		const updates: SessionNotification[] = [];
		const { conn, mockAgent, getAgentConn } = createWithAgentConn();

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				const ac = getAgentConn();
				await ac.sessionUpdate({
					sessionId: params.sessionId,
					update: {
						sessionUpdate: 'agent_message_chunk',
						content: { type: 'text', text: 'thinking...' },
					},
				});
				return { stopReason: 'end_turn' as const };
			},
		);

		conn.handler = createMockClient({
			sessionUpdate: vi.fn(async (p: SessionNotification) => {
				updates.push(p);
			}),
		});

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await conn.newSession({ cwd: '/test', mcpServers: [] });
		await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'test' }],
		});

		expect(updates.length).toBeGreaterThanOrEqual(1);
	});

	it('inbound requestPermission reaches handler and returns decision', async () => {
		const { conn, mockAgent, getAgentConn } = createWithAgentConn();

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				const ac = getAgentConn();
				const decision = (await ac.requestPermission({
					sessionId: params.sessionId,
					toolCall: {
						title: 'Run command',
						kind: 'execute',
						status: 'pending',
						toolCallId: 'tc-1',
						content: [
							{ type: 'content', content: { type: 'text', text: 'ls' } },
						],
					},
					options: [
						{ kind: 'allow_once', name: 'Allow', optionId: 'allow' },
						{ kind: 'reject_once', name: 'Reject', optionId: 'reject' },
					],
				})) as RequestPermissionResponse;
				if (decision.outcome.outcome !== 'selected') {
					throw new Error('Expected selected outcome');
				}
				return { stopReason: 'end_turn' as const };
			},
		);

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await conn.newSession({ cwd: '/test', mcpServers: [] });

		const resp = await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'do something' }],
		});
		expect(resp.stopReason).toBe('end_turn');
		expect(conn.handler.requestPermission).toHaveBeenCalled();
	});

	it('handler swap (late binding) — new handler receives subsequent callbacks', async () => {
		const firstUpdates: SessionNotification[] = [];
		const secondUpdates: SessionNotification[] = [];

		let promptCount = 0;
		const { conn, mockAgent, getAgentConn } = createWithAgentConn();

		mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
			async (params) => {
				const ac = getAgentConn();
				promptCount++;
				await ac.sessionUpdate({
					sessionId: params.sessionId,
					update: {
						sessionUpdate: 'agent_message_chunk',
						content: { type: 'text', text: `turn-${promptCount}` },
					},
				});
				return { stopReason: 'end_turn' as const };
			},
		);

		// First handler
		conn.handler = createMockClient({
			sessionUpdate: vi.fn(async (p: SessionNotification) => {
				firstUpdates.push(p);
			}),
		});

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await conn.newSession({ cwd: '/test', mcpServers: [] });
		await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'first' }],
		});

		// Swap handler
		conn.handler = createMockClient({
			sessionUpdate: vi.fn(async (p: SessionNotification) => {
				secondUpdates.push(p);
			}),
		});

		await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'second' }],
		});

		expect(firstUpdates.length).toBeGreaterThanOrEqual(1);
		expect(secondUpdates.length).toBeGreaterThanOrEqual(1);
	});

	it('dispose closes the transport', async () => {
		const { conn } = create();

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});

		expect(conn.signal.aborted).toBe(false);
		await conn.dispose();

		// After dispose, the connection should close
		await conn.closed;
		expect(conn.signal.aborted).toBe(true);

		// Remove from tracking since we already disposed
		connections.pop();
	});

	it('optional client methods throw RequestError when not implemented', async () => {
		const handler: Client = {
			sessionUpdate: vi.fn(async () => {}),
			requestPermission: vi.fn(async () => ({
				outcome: { outcome: 'selected' as const, optionId: 'allow' },
			})),
			// No writeTextFile, readTextFile, etc.
		};

		const { transport, agentStream } = createMemoryTransport();
		const mockAgent = createMockAgent();
		void new AgentSideConnectionImpl((conn) => {
			mockAgent.prompt = vi.fn<(p: PromptRequest) => Promise<PromptResponse>>(
				async () => {
					try {
						await conn.writeTextFile({
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
			return {
				initialize: (p) => mockAgent.initialize(p),
				newSession: (p) => mockAgent.newSession(p),
				prompt: (p) => mockAgent.prompt(p),
				cancel: (p) => mockAgent.cancel(p),
				authenticate: (p) => mockAgent.authenticate(p),
			};
		}, agentStream);

		const conn = new AgentConnection(transport, handler);
		connections.push(conn);

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		await conn.newSession({ cwd: '/test', mcpServers: [] });

		const resp = await conn.prompt({
			sessionId: 'test-session',
			prompt: [{ type: 'text', text: 'write file' }],
		});
		expect(resp.stopReason).toBe('end_turn');
	});
});
