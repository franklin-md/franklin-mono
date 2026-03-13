import { afterEach, describe, expect, it } from 'vitest';

import type { Stream } from '@agentclientprotocol/sdk';
import {
	AgentSideConnection,
	PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';
import { createMemoryTransport } from '../transport/in-memory.js';

function createMinimalAgent(agentStream: Stream) {
	return new AgentSideConnection(
		() => ({
			initialize: async () => ({
				protocolVersion: PROTOCOL_VERSION,
				agentCapabilities: { loadSession: false },
				authMethods: [],
			}),
			newSession: async () => ({ sessionId: 'test' }),
			prompt: async () => ({ stopReason: 'end_turn' as const }),
			cancel: async () => {},
			authenticate: async () => ({}),
		}),
		agentStream,
	);
}

describe('createMemoryTransport', () => {
	const connections: AgentConnection[] = [];

	afterEach(async () => {
		while (connections.length > 0) {
			const conn = connections.pop();
			if (conn) await conn.dispose();
		}
	});

	it('connects client and agent over in-memory streams', async () => {
		const { transport, agentStream } = createMemoryTransport();
		void createMinimalAgent(agentStream);

		const conn = new AgentConnection(transport);
		connections.push(conn);

		const resp = await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		expect(resp.protocolVersion).toBe(PROTOCOL_VERSION);

		const session = await conn.newSession({ cwd: '/test', mcpServers: [] });
		expect(session.sessionId).toBe('test');
	});

	it('dispose tears down both sides', async () => {
		const { transport, agentStream } = createMemoryTransport();
		void createMinimalAgent(agentStream);

		const conn = new AgentConnection(transport);

		await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});

		expect(conn.signal.aborted).toBe(false);
		await conn.dispose();
		await conn.closed;
		expect(conn.signal.aborted).toBe(true);
	});
});
