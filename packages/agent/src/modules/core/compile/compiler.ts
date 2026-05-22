import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import { createAgentState } from '../agent-state/index.js';
import type { SessionSnapshot } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator } from './decorators/full.js';
import { createToolRegistry } from './decorators/tool/index.js';

export function createCoreCompiler(
	connectAgent: MiniACPConnector,
	snapshot: SessionSnapshot,
): Compiler<CoreSignature, CoreRuntime> {
	return {
		compile: async <ContextRuntime extends BaseRuntime>(
			registry: RegistryView<CoreSignature, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const agentState = createAgentState({
				snapshot,
				registrations: registry,
				getRuntime,
			});
			const toolRegistry = createToolRegistry(registry, getRuntime);
			const decorator = createAgentDecorator(
				agentState,
				registry,
				getRuntime,
				toolRegistry,
			);

			const client = await createAgentClient({
				connectAgent,
				decorator,
				session: snapshot,
				tools: toolRegistry.definitions(),
			});

			return createCoreRuntime({
				client,
				agentState,
			});
		},
	};
}
