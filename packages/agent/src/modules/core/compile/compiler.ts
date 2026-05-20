import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import type { SessionSnapshot } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator } from './decorators/full.js';
import { createCoreRegistrar } from './registrar/index.js';
import { createResources } from './resources.js';
import { serializeTool } from './tools/index.js';

export function createCoreCompiler(
	connectAgent: MiniACPConnector,
	session: SessionSnapshot,
): Compiler<CoreSignature, CoreRuntime> {
	return {
		compile: async <ContextRuntime extends BaseRuntime>(
			registry: RegistryView<CoreSignature, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const resources = createResources(session);
			const coreRegistrar = createCoreRegistrar<ContextRuntime>(registry);
			const decorator = createAgentDecorator(
				resources,
				coreRegistrar,
				getRuntime,
			);
			const serializedTools = coreRegistrar.tools.map(serializeTool);

			const client = await createAgentClient({
				connectAgent,
				decorator,
				session,
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
