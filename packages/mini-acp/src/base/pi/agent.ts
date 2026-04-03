import type { AgentProtocol } from '../../protocol/types.js';
import { createAgentConnection } from '../../protocol/connection.js';
import { createSessionAdapter } from '../../protocol/adapter.js';
import { createPiAdapter } from './adapter.js';

export function bindPiAgent(transport: AgentProtocol): void {
	const connection = createAgentConnection(transport);
	connection.bind(
		createSessionAdapter((ctx) =>
			createPiAdapter({ client: connection.remote, ctx }),
		),
	);
}
