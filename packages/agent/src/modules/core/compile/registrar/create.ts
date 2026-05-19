import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type {
	CoreRegisterToolRegistration,
	CoreSignature,
} from '../../api/api.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { ToolSpec } from '../../api/tool-spec.js';
import type { CoreRegistrar } from './types.js';

function normalizeTool<Runtime extends BaseRuntime>(
	registration: CoreRegisterToolRegistration<Runtime>,
): ExtensionToolDefinition<unknown, Runtime> {
	const [specOrTool, execute] = registration;
	if (!execute) {
		return specOrTool as ExtensionToolDefinition<unknown, Runtime>;
	}
	const spec = specOrTool as ToolSpec;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		execute,
	};
}

function createEmptyCoreRegistrar<
	Runtime extends BaseRuntime,
>(): CoreRegistrar<Runtime> {
	return {
		// `on` event handlers
		prompt: [],
		cancel: [],
		systemPrompt: [],
		turnStart: [],
		chunk: [],
		update: [],
		turnEnd: [],
		toolCall: [],
		toolResult: [],
		// `registerTool`
		tools: [],
	};
}

/**
 * Lower the extension-point contribution log into the runtime builder's
 * handler-indexed registrar shape.
 */
export function createCoreRegistrar<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
): CoreRegistrar<Runtime> {
	const registrar = createEmptyCoreRegistrar<Runtime>();
	for (const [event, handler] of registrations.argsFor('on')) {
		registrar[event].push(handler as never);
	}
	for (const registration of registrations.argsFor('registerTool')) {
		registrar.tools.push(normalizeTool(registration));
	}
	return registrar;
}
