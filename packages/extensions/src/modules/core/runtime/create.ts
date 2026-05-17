import type { ContextTracker } from '@franklin/mini-acp';
import type { StateHandle } from '../../../algebra/modules/state/index.js';
import type { CoreState, SessionSnapshot } from '../state.js';
import { createClientRuntime } from './from-client.js';
import { CORE_STATE, type AgentClient, type CoreRuntime } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly tracker: ContextTracker;
	readonly state: StateHandle<SessionSnapshot>;
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

function sessionSnapshotHandle(
	runtime: CoreRuntime,
): StateHandle<SessionSnapshot> {
	return runtime[CORE_STATE];
}

export function coreStateHandle(runtime: CoreRuntime): StateHandle<CoreState> {
	const handle = sessionSnapshotHandle(runtime);
	return {
		get: async () => ({ core: await handle.get() }),
		fork: async () => ({ core: await handle.fork() }),
		child: async () => ({ core: await handle.child() }),
	};
}
