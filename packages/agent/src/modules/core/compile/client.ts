import type { MiniACPConnector } from '@franklin/mini-acp';
import type { AgentClient } from '../runtime/types.js';
import { connect } from './connect.js';
import type { ProtocolDecorator } from './decorators/types.js';

export async function createAgentClient(input: {
	readonly connectAgent: MiniACPConnector;
	readonly decorator: ProtocolDecorator;
}): Promise<AgentClient> {
	const client = await connect({
		decorator: input.decorator,
		connectAgent: input.connectAgent,
	});
	await client.initialize();
	return client;
}
