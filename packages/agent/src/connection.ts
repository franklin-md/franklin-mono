import type {} from '@agentclientprotocol/sdk';
import { ClientSideConnection } from '@agentclientprotocol/sdk';

import type { AgentCommands, AgentEvents } from './stack/types.js';
import type { Transport } from './transport/index.js';

export type AgentConnection = {
	commands: AgentCommands;

	dispose: () => Promise<void>;
	signal: AbortSignal;
	closed: Promise<void>;
};

export function createAgentConnection(
	transport: Transport,
	handler: AgentEvents,
): AgentConnection {
	const conn = new ClientSideConnection(() => handler, transport.stream);

	// Arrow functions preserve `this` binding to `conn`.
	// ClientSideConnection uses private fields (#connection), which require
	// the method to be called directly on the original instance.
	const commands: AgentCommands = {
		initialize: (p) => conn.initialize(p),
		newSession: (p) => conn.newSession(p),
		loadSession: (p) => conn.loadSession(p),
		listSessions: (p) => conn.listSessions(p),
		prompt: (p) => conn.prompt(p),
		cancel: (p) => conn.cancel(p),
		setSessionMode: (p) => conn.setSessionMode(p),
		setSessionConfigOption: (p) => conn.setSessionConfigOption(p),
		authenticate: (p) => conn.authenticate(p),
	};

	return {
		commands,
		dispose: () => transport.dispose(),
		signal: conn.signal,
		closed: conn.closed,
	};
}
