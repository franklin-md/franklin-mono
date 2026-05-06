import { bindMiniACPRpcAgent } from '../../rpc/agent.js';
import type { AgentProtocol } from '../../rpc/types.js';
import { createSessionAdapter } from '../../protocol/adapter.js';
import { createPiAdapter } from './adapter.js';

export function bindPiAgent(transport: AgentProtocol): void {
	const connection = bindMiniACPRpcAgent(transport);
	connection.bind(
		createSessionAdapter(
			(ctx, server) => createPiAdapter({ ctx, server }),
			connection.remote,
		),
	);
}
