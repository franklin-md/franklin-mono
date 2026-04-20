import type {
	ClientBinding,
	MiniACPAgent,
	MiniACPClient,
} from '@franklin/mini-acp';
import type { ProtocolDecorator } from './types.js';

type ConnectInput = {
	readonly decorator: ProtocolDecorator;
	readonly connection: ClientBinding;
	readonly fallbackServer: MiniACPAgent;
};

export async function connect({
	decorator,
	connection,
	fallbackServer,
}: ConnectInput): Promise<{ client: MiniACPClient }> {
	const server = await decorator.server(fallbackServer);
	connection.bind(server);
	const client = await decorator.client(connection.remote);
	return { client };
}
