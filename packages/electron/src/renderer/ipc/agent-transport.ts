import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { MultiplexedPacket, Duplex } from '@franklin/transport';
import {
	createMultiplexedEventStream,
	streamToEventInterface,
} from '@franklin/transport';

import { AGENT_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentMessage = MultiplexedPacket<AnyMessage>;

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 agent channel + mux
// ---------------------------------------------------------------------------

let agentMux: ReturnType<typeof streamToEventInterface<AgentMessage>> | null =
	null;

function getAgentMux() {
	if (!agentMux) {
		const agentChannel: Duplex<AgentMessage> =
			createIpcStream<AgentMessage>(AGENT_STREAM);
		agentMux = streamToEventInterface(agentChannel);
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
	const inner = createMultiplexedEventStream<AnyMessage>(
		agentId,
		getAgentMux(),
	);

	return {
		readable: inner.readable,
		writable: inner.writable,
		close: async () => {
			await inner.close();
			await window.__franklinBridge.agent.kill(agentId);
		},
	};
}
