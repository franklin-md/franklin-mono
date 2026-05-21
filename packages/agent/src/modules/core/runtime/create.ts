import type { RuntimeAgentState } from '../agent-state/index.js';
import { attachRuntimeAgentState } from './agent-state.js';
import { createClientRuntime } from './from-client.js';
import type { AgentClient, CoreRuntime } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly agentState: RuntimeAgentState;
};

export function createCoreRuntime({
	client,
	agentState,
}: CreateCoreRuntimeInput): CoreRuntime {
	return attachRuntimeAgentState(
		{
			...createClientRuntime(client),
			getSession: () => agentState.getSnapshot(),
		},
		agentState,
	);
}
