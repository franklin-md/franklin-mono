import { createClientConnection, type MiniACPClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from './decorators/types.js';
import type { SpawnResult } from './compiler.js';
import { fallbackServer } from './fallback.js';

type ConnectInput = {
	readonly decorator: ProtocolDecorator;
	readonly transport: SpawnResult;
};

type ReturnType = MiniACPClient & { dispose(): Promise<void> };

export async function connect({
	decorator,
	transport,
}: ConnectInput): Promise<ReturnType> {
	const connection = createClientConnection(transport);

	const server = await decorator.server(fallbackServer);
	connection.bind(server);
	const client = await decorator.client(connection.remote);

	return {
		...client,
		dispose: async () => {
			await transport.dispose();
		},
	};
}
