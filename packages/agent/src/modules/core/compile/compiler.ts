import type { MiniACPConnector } from '@franklin/mini-acp';
import type { Compiler } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { CoreSignature } from '../api/api.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import { createRuntimeAgentState } from '../agent-state/index.js';
import type { SessionSnapshot } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator } from './decorators/full.js';
import { registeredTools } from './registrations/index.js';
import { serializeTool } from './tools/index.js';

export function createCoreCompiler(
	connectAgent: MiniACPConnector,
	snapshot: SessionSnapshot,
): Compiler<CoreSignature, CoreRuntime> {
	return {
		compile: async <ContextRuntime extends BaseRuntime>(
			registry: RegistryView<CoreSignature, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const agentState = createRuntimeAgentState({
				snapshot,
				registrations: registry,
				getRuntime,
			});
			const decorator = createAgentDecorator(agentState, registry, getRuntime);
			const serializedTools = registeredTools(registry).map(serializeTool);

			const client = await createAgentClient({
				connectAgent,
				decorator,
				session: snapshot,
				tools: serializedTools,
			});

			return createCoreRuntime({
				client,
				agentState,
			});
		},
	};
}
