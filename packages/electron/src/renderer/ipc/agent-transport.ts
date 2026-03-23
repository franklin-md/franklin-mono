import type { ClientTransport } from '@franklin/agent/browser';
import type { Duplex } from '@franklin/transport';
import { Multiplexer } from '@franklin/transport';

import { AGENT_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';
import type {
	AgentClientMux,
	AgentMuxDown,
	AgentMuxUp,
} from '../../shared/types.js';

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 agent multiplexer
// ---------------------------------------------------------------------------

let agentMux: AgentClientMux | null = null;

function getAgentMux(): AgentClientMux {
	if (!agentMux) {
		const agentChannel: Duplex<AgentMuxUp, AgentMuxDown> = createIpcStream<
			AgentMuxUp,
			AgentMuxDown
		>(AGENT_STREAM);
		agentMux = new Multiplexer(agentChannel);
	}
	return agentMux;
}

// ---------------------------------------------------------------------------
// createIpcAgentTransport
// ---------------------------------------------------------------------------

/**
 * Creates an IPC-backed MiniACPProtocol transport for a specific agent.
 *
 * Level 2 demux by agentId within the shared "agent-transport" channel.
 * Wraps dispose to also kill the agent subprocess in main.
 */
export function createIpcAgentTransport(agentId: string): ClientTransport {
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
