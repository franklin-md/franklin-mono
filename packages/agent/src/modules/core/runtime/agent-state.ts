import type { AgentState } from '../agent-state/index.js';
import type { CoreRuntime } from './types.js';

const AGENT_STATE: unique symbol = Symbol('franklin/core/agent-state');

type AgentStateCarrier = {
	readonly [AGENT_STATE]?: AgentState;
};

export function attachAgentState<Runtime extends CoreRuntime>(
	runtime: Runtime,
	agentState: AgentState,
): Runtime {
	Object.defineProperty(runtime, AGENT_STATE, {
		value: agentState,
		enumerable: true,
	});
	return runtime;
}

export function getAgentState(runtime: CoreRuntime): AgentState {
	const agentState = (runtime as AgentStateCarrier)[AGENT_STATE];
	if (!agentState) {
		throw new Error('Core runtime is missing internal agent state');
	}
	return agentState;
}
