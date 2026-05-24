import type { MiniACPClientHandle, MiniACPConnector } from '@franklin/mini-acp';
import type { AgentController } from '../controller/index.js';

export async function connect(input: {
	readonly connectAgent: MiniACPConnector;
	readonly controller: AgentController;
}): Promise<MiniACPClientHandle> {
	const connectedClient = await input.connectAgent(input.controller.server);
	return input.controller.bind(connectedClient);
}
