import {
	bindJsonRpcClient,
	bindJsonRpcServer,
	type PeerBinding,
} from '@franklin/lib/transport';

import type {
	MuClient,
	MuAgent,
	MiniACPClientHandle,
	MiniACPConnector,
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
	return bindJsonRpcClient({
		duplex,
		server: muServerDescriptor,
		client: muClientDescriptor,
	});
}

export function createMiniACPConnector(
	spawn: () => ClientProtocol | Promise<ClientProtocol>,
): MiniACPConnector {
	return async (server) => {
		const transport = await spawn();
		return connectMiniACPClient(transport, server);
	};
}

export function connectMiniACPClient(
	transport: ClientProtocol,
	server: MuAgent,
): MiniACPClientHandle {
	const connection = createClientConnection(transport);
	const binding = connection.bind(server);

	return {
		...connection.remote,
		dispose: async () => {
			await binding.close();
		},
	};
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
	return bindJsonRpcServer({
		duplex,
		server: muServerDescriptor,
		client: muClientDescriptor,
	});
}
