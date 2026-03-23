import { bindClient, bindServer, type Binding } from '@franklin/transport';

import type {
	MuClient,
	MuAgent,
	ClientProtocol,
	AgentProtocol,
} from './types.js';
import { muManifest } from './manifest.js';

// ---------------------------------------------------------------------------
// Client connection — you are the client, calling the agent
// ---------------------------------------------------------------------------

export type ClientConnection = Binding<MuClient>;

/**
 * Create a client-side connection over a Mu protocol transport.
 *
 */
export function createClientConnection(
	duplex: ClientProtocol,
	handlers: MuAgent,
): ClientConnection {
	return bindClient({
		duplex,
		manifest: muManifest,
		handlers,
	});
}

// ---------------------------------------------------------------------------
// Agent connection — you are the agent, handling client requests
// ---------------------------------------------------------------------------

export type AgentConnection = Binding<MuAgent>;

/**
 * Create an agent-side connection over a MiniACP protocol transport.
 *
 * You provide `handlers` (MiniACPClient) — what the client can call on you
 * (e.g. initialize, setContext, prompt, cancel). Returns a binding whose
 * `.remote` is a MiniACPAgent proxy for calling toolExecute on the client.
 */
export function createAgentConnection(
	duplex: AgentProtocol,
	handlers: MuClient,
): AgentConnection {
	return bindServer({
		duplex,
		manifest: muManifest,
		handlers,
	});
}
