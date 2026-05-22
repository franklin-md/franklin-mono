import type { AgentState } from '../agent-state/index.js';
import { attachAgentState } from './agent-state.js';
import { createClientRuntime } from './from-client.js';
import type { AgentClient, CoreRuntime } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly agentState: AgentState;
};

export function createCoreRuntime({
	client,
	agentState,
}: CreateCoreRuntimeInput): CoreRuntime {
	return attachAgentState(
		{
			...createClientRuntime(client),
			getSession: () => agentState.getSnapshot(),
		},
		agentState,
	);
}
