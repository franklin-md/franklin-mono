import { vi } from 'vitest';

import type {
	Agent,
	Client,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import {
	AgentSideConnection,
	PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';

import type { Transport } from '../../transport/index.js';
import { createMemoryTransport } from '../../transport/in-memory.js';

/**
 * Collects all agent text from session update notifications.
 * Filters for `agent_message_chunk` updates with `text` content.
 */
export function collectAgentText(updates: SessionNotification[]): string {
	return updates
		.flatMap((update) => {
			if (update.update.sessionUpdate !== 'agent_message_chunk') {
				return [];
			}
			if (update.update.content.type !== 'text') {
				return [];
			}
			return [update.update.content.text];
		})
		.join('');
}

/**
 * Creates a mock Agent implementation with sensible defaults.
 * Pass overrides to customize individual methods.
 */
export function createMockAgent(
	overrides?: Partial<Agent>,
): Agent & { conn?: AgentSideConnection } {
	const agent: Agent & { conn?: AgentSideConnection } = {
		initialize: vi.fn(async (_params) => ({
			protocolVersion: PROTOCOL_VERSION,
			agentCapabilities: { loadSession: false },
			authMethods: [],
		})),
		newSession: vi.fn(async (_params) => ({
			sessionId: 'test-session',
		})),
		prompt: vi.fn(async (_params) => ({
			stopReason: 'end_turn' as const,
		})),
		cancel: vi.fn(async () => {}),
		authenticate: vi.fn(async () => ({})),
		...overrides,
	};
	return agent;
}

/**
 * Creates a mock Client implementation with vi.fn() stubs.
 * Pass overrides to customize individual methods.
 */
export function createMockClient(overrides?: Partial<Client>): Client {
	return {
		sessionUpdate: vi.fn(async () => {}),
		requestPermission: vi.fn(async () => ({
			outcome: {
				outcome: 'selected' as const,
				optionId: 'allow',
			},
		})),
		...overrides,
	};
}

/**
 * Sets up a full in-memory AgentConnection ↔ AgentSideConnection pair.
 * Returns both sides for testing.
 */
export function createTestPair(agentOverrides?: Partial<Agent>): {
	transport: Transport;
	agentConn: AgentSideConnection;
	mockAgent: Agent & { conn?: AgentSideConnection };
} {
	const { transport, agentStream } = createMemoryTransport();
	const mockAgent = createMockAgent(agentOverrides);

	const agentConn = new AgentSideConnection((conn) => {
		mockAgent.conn = undefined;
		// Return the agent implementation, capturing the conn for agent-initiated calls
		const wrappedAgent: Agent = {
			initialize: (p) => mockAgent.initialize(p),
			newSession: (p) => mockAgent.newSession(p),
			prompt: (p) => mockAgent.prompt(p),
			cancel: (p) => mockAgent.cancel(p),
			authenticate: (p) => mockAgent.authenticate(p),
		};
		// Store the connection on the mock so tests can use it for agent-initiated calls
		mockAgent.conn = conn;
		return wrappedAgent;
	}, agentStream);

	return { transport, agentConn, mockAgent };
}
