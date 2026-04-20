import type { ToolDefinition as SerializedToolDefinition } from '@franklin/mini-acp';
import { assembleRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { createAgentClient } from './agent-client.js';
import type { SpawnResult } from './compiler.js';
import { compose } from './decorators/compose.js';
import { createTrackerDecorator } from './decorators/tracker.js';
import { createUsageTrackerDecorator } from './decorators/usage-tracker.js';
import type { ProtocolDecorator } from './decorators/types.js';
import { createResources } from './resources.js';

export async function createCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	extensionDecorators: readonly ProtocolDecorator[],
	tools: readonly SerializedToolDefinition[],
): Promise<CoreRuntime> {
	const { tracker, usageTracker, stateHandle } = createResources(state);

	const decorator = compose([
		...extensionDecorators,
		createTrackerDecorator(tracker),
		createUsageTrackerDecorator(usageTracker),
	]);

	const client = await createAgentClient({
		transport,
		decorator,
		state,
		tools,
	});

	return assembleRuntime(client, tracker, stateHandle);
}
