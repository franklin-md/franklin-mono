import type { Model } from '@mariozechner/pi-ai';

import type { AgentProtocol } from '../../protocol/types.js';
import { createAgentConnection } from '../../protocol/connection.js';
import { createSessionAdapter } from '../../protocol/adapter.js';
import { createPiAdapter } from './adapter.js';

export function createPiAgentFactory(
	model: Model<string>,
): (transport: AgentProtocol) => void {
	return (transport) => {
		const connection = createAgentConnection(transport);
		connection.bind(
			createSessionAdapter((ctx) =>
				createPiAdapter({ client: connection.remote, model, ctx }),
			),
		);
	};
}
