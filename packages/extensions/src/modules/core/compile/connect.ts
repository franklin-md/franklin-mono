import { createClientConnection } from '@franklin/mini-acp';
import type { AgentClient } from '../runtime/types.js';
import type { ProtocolDecorator } from './decorators/types.js';
import type { SpawnResult } from './compiler.js';
import { fallbackServer } from './fallback.js';

export async function connect(input: {
	readonly decorator: ProtocolDecorator;
	readonly transport: SpawnResult;
}): Promise<AgentClient> {
	const connection = createClientConnection(input.transport);

	const server = await input.decorator.server(fallbackServer);
	connection.bind(server);
	const client = await input.decorator.client(connection.remote);

	return {
		...client,
		dispose: async () => {
			await input.transport.dispose();
		},
	};
}
