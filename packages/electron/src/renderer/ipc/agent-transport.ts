import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { MuxPacket, Duplex } from '@franklin/transport/core';
import { Multiplexer } from '@franklin/transport/core';

import { AGENT_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 agent multiplexer
// ---------------------------------------------------------------------------

let agentMux: Multiplexer<AnyMessage> | null = null;

function getAgentMux(): Multiplexer<AnyMessage> {
	if (!agentMux) {
		const agentChannel: Duplex<MuxPacket<AnyMessage>> =
			createIpcStream<MuxPacket<AnyMessage>>(AGENT_STREAM);
		agentMux = new Multiplexer(agentChannel);
	}
	return agentMux;
}

// ---------------------------------------------------------------------------
// createIpcAgentTransport
// ---------------------------------------------------------------------------

/**
 * Creates an IPC-backed AgentTransport for a specific agent.
 *
 * Level 2 demux by agentId within the shared "agent-transport" channel.
 * Wraps dispose to also kill the agent subprocess in main.
 */
export function createIpcAgentTransport(agentId: string): Duplex<AnyMessage> {
	const inner = getAgentMux().channel(agentId);

	return {
		readable: inner.readable,
		writable: inner.writable,
		close: async () => {
			await inner.close();
			await window.__franklinBridge.agent.kill(agentId);
		},
	};
}
