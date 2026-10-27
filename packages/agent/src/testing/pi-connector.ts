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
	contextWindow: number,
): MiniACPConnector {
	return createMiniACPRpcConnector(() => {
		const { a, b } = createDuplexPair<JsonRpcMessage>();
		const connection = bindMiniACPRpcAgent(b);
		connection.bind(
			createPiAgent(
				{
					...connection.remote,
					prepareContext: async (params) => {
						await connection.remote.prepareContext?.({
							...params,
							contextWindow,
						});
					},
				},
				options,
			),
		);
		return a;
	});
}
