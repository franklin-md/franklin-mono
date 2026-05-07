import { createDuplexPair } from '@franklin/lib/transport';
import { createPiAgent, debugMiniACP } from '@franklin/mini-acp';
import {
	bindMiniACPRpcAgent,
	type AgentProtocol,
	type ClientProtocol,
} from '@franklin/mini-acp/rpc';
import type { StreamFn } from '@mariozechner/pi-agent-core';

type SpawnOptions = {
	streamFn?: StreamFn;
};

export function spawn(options: SpawnOptions = {}): ClientProtocol {
	const { streamFn } = options;
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as ClientProtocol;
	const agentDuplex = b as unknown as AgentProtocol;

	const connection = bindMiniACPRpcAgent(agentDuplex);
	const session = createPiAgent(
		debugMiniACP(connection.remote, 'agent:tools'),
		{
			streamFn,
		},
	);

	connection.bind(debugMiniACP(session, 'agent:client'));

	return clientDuplex;
}
