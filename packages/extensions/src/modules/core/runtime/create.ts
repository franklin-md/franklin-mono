import type { CtxTracker } from '@franklin/mini-acp';
import type { StateHandle } from '../../../algebra/runtime/index.js';
import type { CoreState } from '../state.js';
import { createClientRuntime } from './from-client.js';
import { CORE_STATE, type AgentClient, type CoreRuntime } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly tracker: CtxTracker;
	readonly state: StateHandle<CoreState>;
};

export function createCoreRuntime({
	client,
	tracker,
	state,
}: CreateCoreRuntimeInput): CoreRuntime {
	return {
		...createClientRuntime(client),
		context: () => tracker.get(),
		[CORE_STATE]: state,
	};
}

export function coreStateHandle(runtime: CoreRuntime): StateHandle<CoreState> {
	return runtime[CORE_STATE];
}
