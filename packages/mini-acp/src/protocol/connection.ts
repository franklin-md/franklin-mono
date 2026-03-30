import { bindClient, bindServer, type PeerBinding } from '@franklin/transport';

import type {
	MuClient,
	MuAgent,
	ClientProtocol,
	AgentProtocol,
} from './types.js';
import { muServerDescriptor, muClientDescriptor } from './manifest.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientBinding = PeerBinding<MuClient, MuAgent>;
export type AgentBinding = PeerBinding<MuAgent, MuClient>;

// ---------------------------------------------------------------------------
// Client — you are the client, calling the agent
// ---------------------------------------------------------------------------

/**
 * Bind as the client over a MiniACP transport.
 *
 * Returns `remote` (agent proxy: initialize, prompt, etc.) immediately.
 * Call `bind(handlers)` to provide client-side handlers (toolExecute)
 * and start message dispatch.
 */
export function createClientConnection(duplex: ClientProtocol): ClientBinding {
	return bindClient({
		duplex,
		server: muServerDescriptor,
		client: muClientDescriptor,
	});
}

// ---------------------------------------------------------------------------
// Agent — you are the agent, handling client requests
// ---------------------------------------------------------------------------

/**
 * Bind as the agent over a MiniACP transport.
 *
 * Returns `remote` (client proxy: toolExecute) immediately.
 * Call `bind(handlers)` to provide agent-side handlers (initialize,
 * setContext, prompt, cancel) and start message dispatch.
 */
export function createAgentConnection(duplex: AgentProtocol): AgentBinding {
	return bindServer({
		duplex,
		server: muServerDescriptor,
		client: muClientDescriptor,
	});
}
