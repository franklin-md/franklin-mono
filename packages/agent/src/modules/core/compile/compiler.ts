import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { createAgentController } from '../controller/index.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import type { SessionSnapshot } from '../state.js';
import { createAgentClient } from './client.js';
import { createCoreRegistry } from '../registrations/index.js';
import { createToolRegistry } from '../tools/index.js';

export function createCoreCompiler(
	connectAgent: MiniACPConnector,
	snapshot: SessionSnapshot,
): Compiler<CoreSignature, CoreRuntime> {
	return {
		compile: async <ContextRuntime extends BaseRuntime>(
			registry: RegistryView<CoreSignature, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const registrations = createCoreRegistry(registry, getRuntime);
			const toolRegistry = createToolRegistry(
				registrations.tools,
				snapshot.toolFilter,
			);
			const controller = createAgentController({
				snapshot,
				registrations,
				toolRegistry,
			});

			const client = await createAgentClient({
				connectAgent,
				controller,
			});

			return createCoreRuntime({
				client,
				controller,
			});
		},
	};
}
