import type {
	MiniACPConnector,
	ToolDefinition as SerializedToolDefinition,
} from '@franklin/mini-acp';
import type { CoreState } from '../state.js';
import type { AgentClient } from '../runtime/types.js';
import { bootRuntime } from './boot.js';
import { connect } from './connect.js';
import type { ProtocolDecorator } from './decorators/types.js';

export async function createAgentClient(input: {
	readonly connectAgent: MiniACPConnector;
	readonly decorator: ProtocolDecorator;
	readonly state: CoreState;
	readonly tools: readonly SerializedToolDefinition[];
}): Promise<AgentClient> {
	const client = await connect({
		decorator: input.decorator,
		connectAgent: input.connectAgent,
	});
	await bootRuntime({ client, state: input.state, tools: input.tools });
	return client;
}
