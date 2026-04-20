import type {
	ClientBinding,
	MiniACPAgent,
	MiniACPClient,
} from '@franklin/mini-acp';

export type ProtocolDecorator = {
	readonly name: string;
	readonly server: (server: MiniACPAgent) => Promise<MiniACPAgent>;
	readonly client: (client: MiniACPClient) => Promise<MiniACPClient>;
};

type ComposeProtocolInput = {
	readonly stack: readonly ProtocolDecorator[];
	readonly connection: ClientBinding;
	readonly fallbackServer: MiniACPAgent;
};

export async function composeProtocol({
	stack,
	connection,
	fallbackServer,
}: ComposeProtocolInput): Promise<{ client: MiniACPClient }> {
	let server = fallbackServer;
	for (const d of stack) server = await d.server(server);

	connection.bind(server);

	let client = connection.remote;
	for (const d of stack.toReversed()) client = await d.client(client);

	return { client };
}
