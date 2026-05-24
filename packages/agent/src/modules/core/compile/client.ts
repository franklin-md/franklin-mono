import type { MiniACPClientHandle, MiniACPConnector } from '@franklin/mini-acp';
import { connect } from './connect.js';
import type { ProtocolDecorator } from './decorators/types.js';

export async function createAgentClient(input: {
	readonly connectAgent: MiniACPConnector;
	readonly decorator: ProtocolDecorator;
}): Promise<MiniACPClientHandle> {
	const client = await connect({
		decorator: input.decorator,
		connectAgent: input.connectAgent,
	});
	await client.initialize();
	return client;
}
