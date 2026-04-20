import type { ToolDefinition as SerializedToolDefinition } from '@franklin/mini-acp';
import { assembleRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { bootRuntime } from './boot.js';
import type { SpawnResult } from './compiler.js';
import { compose } from './decorators/compose.js';
import { connect } from './decorators/connect.js';
import { createTrackerDecorator } from './decorators/tracker.js';
import type { ProtocolDecorator } from './decorators/types.js';
import { fallbackServer } from './fallback.js';
import { createResources } from './resources.js';

export async function createCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	extensionDecorators: readonly ProtocolDecorator[],
	tools: readonly SerializedToolDefinition[],
): Promise<CoreRuntime> {
	const { connection, tracker } = createResources(transport);

	const decorator = compose([
		...extensionDecorators,
		createTrackerDecorator(tracker),
	]);
	const { client } = await connect({ decorator, connection, fallbackServer });

	await bootRuntime({ client, state, tools });

	return assembleRuntime(client, tracker, transport);
}
