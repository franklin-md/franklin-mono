import type {
	MiniACPClientHandle,
	MiniACPConnector,
	MuAgent,
} from '../protocol/types.js';
import { bindMiniACPRpcClient } from './client.js';
import type { MiniACPRpcProtocol } from './types.js';

export function createMiniACPRpcConnector(
	spawn: () => MiniACPRpcProtocol | Promise<MiniACPRpcProtocol>,
): MiniACPConnector {
	return async (server) => {
		const transport = await spawn();
		return connectMiniACPRpcClient(transport, server);
	};
}

function connectMiniACPRpcClient(
	transport: MiniACPRpcProtocol,
	server: MuAgent,
): MiniACPClientHandle {
	const connection = bindMiniACPRpcClient(transport);
	const binding = connection.bind(server);

	return {
		...connection.remote,
		dispose: async () => {
			await binding.close();
		},
	};
}
