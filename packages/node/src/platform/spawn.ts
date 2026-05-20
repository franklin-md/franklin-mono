import { createDuplexPair } from '@franklin/lib/transport';
import { createPiAgent } from '@franklin/mini-acp';
import { debugMiniACP } from '@franklin/mini-acp/debug';
import {
	bindMiniACPRpcAgent,
	type MiniACPRpcProtocol,
} from '@franklin/mini-acp/rpc';
import type { StreamFn } from '@earendil-works/pi-agent-core';

type SpawnOptions = {
	streamFn?: StreamFn;
};

export function spawn(options: SpawnOptions = {}): MiniACPRpcProtocol {
	const { streamFn } = options;
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as MiniACPRpcProtocol;
	const agentDuplex = b as unknown as MiniACPRpcProtocol;

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
