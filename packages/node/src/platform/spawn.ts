import { createDuplexPair } from '@franklin/lib/transport';
import {
	type ClientProtocol,
	type AgentProtocol,
	createAgentConnection,
	createPiAdapter,
	createSessionAdapter,
	debugMiniACP,
} from '@franklin/mini-acp';

export function spawn(): ClientProtocol {
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as ClientProtocol;
	const agentDuplex = b as unknown as AgentProtocol;
	const label = 'agent';

	const connection = createAgentConnection(agentDuplex);
	const session = debugMiniACP(
		createSessionAdapter(
			(ctx, server) =>
				createPiAdapter({ ctx, server: debugMiniACP(server, label) }),
			connection.remote,
		),
		label,
	);

	connection.bind(session);

	return clientDuplex;
}
