import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';
import type { CoreAPI } from '../api/api.js';
import { serializeTool } from '../api/tools/index.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import type { CoreState } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator } from './decorators/full.js';
import {
	asCoreRegistrar,
	createCoreApi,
	createCoreRegistrations,
} from './registrar/index.js';
import { createResources } from './resources.js';

export function createCoreCompiler(
	connectAgent: MiniACPConnector,
	state: CoreState,
): Compiler<CoreAPI, CoreRuntime> {
	const registrations = createCoreRegistrations();

	return {
		createApi: <ContextRuntime extends BaseRuntime>() =>
			createCoreApi<ContextRuntime>(registrations),
		build: async <ContextRuntime extends BaseRuntime>(
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const resources = createResources(state);
			const coreRegistrar = asCoreRegistrar<ContextRuntime>(registrations);
			const decorator = createAgentDecorator(
				resources,
				coreRegistrar,
				getRuntime,
			);
			const serializedTools = coreRegistrar.tools.map(serializeTool);

			const client = await createAgentClient({
				connectAgent,
				decorator,
				state,
				tools: serializedTools,
			});

			return createCoreRuntime({
				client,
				tracker: resources.tracker,
				state: resources.stateHandle,
			});
		},
	};
}
