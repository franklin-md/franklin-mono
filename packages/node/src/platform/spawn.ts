import { createDuplexPair } from '@franklin/transport';
import {
	type ClientProtocol,
	type AgentProtocol,
	createAgentConnection,
	debugMiniACP,
	createSessionAdapter,
	createPiAdapter,
} from '@franklin/mini-acp';

export function spawn(): ClientProtocol {
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as ClientProtocol;
	const agentDuplex = b as unknown as AgentProtocol;

	const connection = createAgentConnection(agentDuplex);
	const session = createSessionAdapter(
		(ctx, server) => createPiAdapter({ ctx, server: debugMiniACP(server) }),
		connection.remote,
	);

	connection.bind(session);

	return clientDuplex;
}
