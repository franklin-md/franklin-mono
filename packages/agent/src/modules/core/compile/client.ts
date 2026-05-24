import type { MiniACPClientHandle, MiniACPConnector } from '@franklin/mini-acp';
import type { AgentController } from '../controller/index.js';
import { connect } from './connect.js';

export async function createAgentClient(input: {
	readonly connectAgent: MiniACPConnector;
	readonly controller: AgentController;
}): Promise<MiniACPClientHandle> {
	const client = await connect({
		connectAgent: input.connectAgent,
		controller: input.controller,
	});
	await client.initialize();
	return client;
}
