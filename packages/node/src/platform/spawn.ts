import { createDuplexPair, debugStream } from '@franklin/transport';
import {
	bindPiAgent,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';

export function spawn(): ClientProtocol {
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as ClientProtocol;
	const agentDuplex = b as unknown as AgentProtocol;

	bindPiAgent(debugStream(agentDuplex, 'agent') as AgentProtocol);

	return clientDuplex;
}
