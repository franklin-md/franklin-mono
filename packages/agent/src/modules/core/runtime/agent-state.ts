import type { RuntimeAgentState } from '../agent-state/index.js';
import type { CoreRuntime } from './types.js';

const RUNTIME_AGENT_STATE: unique symbol = Symbol(
	'franklin/core/runtime-agent-state',
);

type RuntimeAgentStateCarrier = {
	readonly [RUNTIME_AGENT_STATE]?: RuntimeAgentState;
};

export function attachRuntimeAgentState<Runtime extends CoreRuntime>(
	runtime: Runtime,
	agentState: RuntimeAgentState,
): Runtime {
	Object.defineProperty(runtime, RUNTIME_AGENT_STATE, {
		value: agentState,
		enumerable: true,
	});
	return runtime;
}

export function getRuntimeAgentState(runtime: CoreRuntime): RuntimeAgentState {
	const agentState = (runtime as RuntimeAgentStateCarrier)[RUNTIME_AGENT_STATE];
	if (!agentState) {
		throw new Error('Core runtime is missing internal agent state');
	}
	return agentState;
}
