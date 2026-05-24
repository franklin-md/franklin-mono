import type { MiniACPClientHandle, MiniACPConnector } from '@franklin/mini-acp';
import type { ProtocolDecorator } from './decorators/types.js';
import { fallbackServer } from './fallback.js';

export async function connect(input: {
	readonly decorator: ProtocolDecorator;
	readonly connectAgent: MiniACPConnector;
}): Promise<MiniACPClientHandle> {
	const server = await input.decorator.server(fallbackServer);
	const connectedClient = await input.connectAgent(server);
	const client = await input.decorator.client(connectedClient);

	return {
		...client,
		dispose: async () => {
			await connectedClient.dispose();
		},
	};
}
