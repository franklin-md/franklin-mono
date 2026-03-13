import { vi } from 'vitest';

import type { Agent, Client, Stream } from '@agentclientprotocol/sdk';
import {
	AgentSideConnection,
	PROTOCOL_VERSION,
	ndJsonStream,
} from '@agentclientprotocol/sdk';

import type { Transport } from '../transport.js';

/**
 * Creates an in-memory transport pair using TransformStreams.
 * Returns a Transport (for the client side) and an agentStream (for the agent side).
 * No subprocess, no JSON serialization — fast and deterministic.
 *
 * We keep references to the byte-level TransformStream writables so dispose()
 * can close them directly. The ndJsonStream writable is locked by the ACP
 * Connection class, but ndJsonStream only temporarily locks the byte-level
 * output on each write, so closing it between writes works.
 */
export function createMemoryTransport(): {
	transport: Transport;
	agentStream: Stream;
} {
	// Two byte-level pipes connecting client ↔ agent
	const clientToAgent = new TransformStream<Uint8Array>();
	const agentToClient = new TransformStream<Uint8Array>();

	// Client writes to clientToAgent, reads from agentToClient
	const clientStream = ndJsonStream(
		clientToAgent.writable,
		agentToClient.readable,
	);

	// Agent writes to agentToClient, reads from clientToAgent
	const agentStream = ndJsonStream(
		agentToClient.writable,
		clientToAgent.readable,
	);

	const transport: Transport = {
		stream: clientStream,
		async dispose() {
			// Close the byte-level writable ends to tear down both connections.
			// ndJsonStream only locks these temporarily per-write, so closing
			// them between writes is safe. This causes the readers on the other
			// side to see EOF, which closes both ACP connections.
			await clientToAgent.writable.close().catch(() => {});
			await agentToClient.writable.close().catch(() => {});
		},
	};

	return { transport, agentStream };
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
