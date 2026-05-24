import type { MiniACPClientHandle, MiniACPConnector } from '@franklin/mini-acp';
import type { AgentController } from '../controller/index.js';

export async function createAgentClient(input: {
	readonly connectAgent: MiniACPConnector;
	readonly controller: AgentController;
}): Promise<MiniACPClientHandle> {
	const connectedClient = await input.connectAgent(input.controller.server);
	const client = input.controller.bind(connectedClient);
	await client.initialize();
	return client;
}
