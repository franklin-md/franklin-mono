import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type {
	CoreRegisterToolRegistration,
	CoreSignature,
} from '../../api/api.js';
import type { ToolSpec } from '../../api/tool-spec.js';
import type { RegisteredTool } from '../tools/index.js';
import type { CoreRegistrar } from './types.js';

function normalizeTool<Runtime extends BaseRuntime>(
	registration: CoreRegisterToolRegistration<Runtime>,
): RegisteredTool<unknown, Runtime> {
	const [specOrTool, execute] = registration;
	if (!execute) {
		return specOrTool as RegisteredTool<unknown, Runtime>;
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
		const tool = normalizeTool(registration);
		// TODO: define duplicate tool-name policy at the compiler/tool lowering boundary.
		registrar.tools.push(tool);
	}
	return registrar;
}
