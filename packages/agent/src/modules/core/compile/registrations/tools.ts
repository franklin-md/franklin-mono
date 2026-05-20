import type { BaseRuntime, RegistryView } from '@franklin/extensibility';

import type {
	CoreRegisterToolRegistration,
	CoreSignature,
} from '../../api/api.js';
import type { ToolSpec } from '../../api/tool-spec.js';
import type { RegisteredTool } from '../tools/index.js';

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

export function registeredTools<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
): RegisteredTool<unknown, Runtime>[] {
	// TODO: define duplicate tool-name policy at the compiler/tool lowering boundary.
	return registrations.argsFor('registerTool').map(normalizeTool);
}
