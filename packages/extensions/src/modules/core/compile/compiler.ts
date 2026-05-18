import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { RegistryView } from '../../../algebra/extension-points/view.js';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';
import type { CoreSignature } from '../api/api.js';
import { serializeTool } from '../api/tools/index.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import type { SessionSnapshot } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator } from './decorators/full.js';
import { createCoreRegistrar } from './registrar/index.js';
import { createResources } from './resources.js';

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
