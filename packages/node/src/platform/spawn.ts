import { createDuplexPair } from '@franklin/lib/transport';
import {
	createPiAdapter,
	createSessionAdapter,
	debugMiniACP,
} from '@franklin/mini-acp';
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
	const label = 'agent';

	const connection = bindMiniACPRpcAgent(agentDuplex);
	const session = debugMiniACP(
		createSessionAdapter(
			(ctx, server) =>
				createPiAdapter({
					ctx,
					server: debugMiniACP(server, label),
					streamFn,
				}),
			connection.remote,
		),
		label,
	);

	connection.bind(session);

	return clientDuplex;
}
