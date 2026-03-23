import { bindClient, bindServer, type Binding } from '@franklin/transport';

import type {
	MiniACPClient,
	MiniACPAgent,
	ClientProtocol,
	AgentProtocol,
} from './types.js';
import { miniACPManifest } from './manifest.js';

// ---------------------------------------------------------------------------
// Client connection — you are the client, calling the agent
// ---------------------------------------------------------------------------

export type ClientConnection = Binding<MiniACPClient>;

/**
 * Create a client-side connection over a MiniACP protocol transport.
 *
 * You provide `handlers` (MiniACPAgent) — what the agent can call back to you
 * (e.g. toolExecute). Returns a binding whose `.remote` is a MiniACPClient
 * proxy for calling initialize/setContext/prompt/cancel on the agent.
 */
export function createClientConnection(
	duplex: ClientProtocol,
	handlers: MiniACPAgent,
): ClientConnection {
	return bindClient({
		duplex,
		manifest: miniACPManifest,
		handlers,
	});
}

// ---------------------------------------------------------------------------
// Agent connection — you are the agent, handling client requests
// ---------------------------------------------------------------------------

export type AgentConnection = Binding<MiniACPAgent>;

/**
 * Create an agent-side connection over a MiniACP protocol transport.
 *
 * You provide `handlers` (MiniACPClient) — what the client can call on you
 * (e.g. initialize, setContext, prompt, cancel). Returns a binding whose
 * `.remote` is a MiniACPAgent proxy for calling toolExecute on the client.
 */
export function createAgentConnection(
	duplex: AgentProtocol,
	handlers: MiniACPClient,
): AgentConnection {
	return bindServer({
		duplex,
		manifest: miniACPManifest,
		handlers,
	});
}
