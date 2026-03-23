import type { Duplex } from '@franklin/transport';
import { Multiplexer } from '@franklin/transport';

import { AGENT_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';
import type {
	ClientMux,
	ClientSendMux,
	ClientReceiveMux,
} from '../../shared/types.js';
import type { ClientProtocol } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 agent multiplexer
// ---------------------------------------------------------------------------

let agentMux: ClientMux | null = null;

function getAgentMux(): ClientMux {
	if (!agentMux) {
		const agentChannel: Duplex<ClientReceiveMux, ClientSendMux> =
			createIpcStream<ClientReceiveMux, ClientSendMux>(AGENT_STREAM);
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
export function createIpcAgentTransport(agentId: string): ClientProtocol {
	const inner = getAgentMux().channel(agentId);

	// The multiplexer channel carries raw JSON-RPC messages — cast to the
	// typed protocol duplex for downstream consumers (createClientConnection).
	const transport = {
		readable: inner.readable,
		writable: inner.writable,
		close: async () => {
			await inner.close();
			await window.__franklinBridge.agent.kill(agentId);
		},
	};
	return transport;
}
