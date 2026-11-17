import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createPiAgent,
	type CreatePiAgentOptions,
	type MiniACPConnector,
} from '@franklin/mini-acp';
import {
	bindMiniACPRpcAgent,
	createMiniACPRpcConnector,
} from '@franklin/mini-acp/rpc';

export function createPiTestConnector(
	options: CreatePiAgentOptions,
): MiniACPConnector {
	return createMiniACPRpcConnector(() => {
		const { a, b } = createDuplexPair<JsonRpcMessage>();
		const connection = bindMiniACPRpcAgent(b);
		connection.bind(createPiAgent(connection.remote, options));
		return a;
	});
}
