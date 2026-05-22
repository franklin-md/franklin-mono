import type {
	BaseRuntime,
	EffectValueForName,
	RegistryView,
} from '@franklin/extensibility';

import type { CoreSignature } from '../../api/api.js';
import type { AnyRegisteredTool } from '../tools/index.js';

type RegisterToolArgs<Runtime extends BaseRuntime> = EffectValueForName<
	CoreSignature,
	Runtime,
	'registerTool'
>;

function normalizeTool<Runtime extends BaseRuntime>(
	registration: RegisterToolArgs<Runtime>,
): AnyRegisteredTool<Runtime> {
	const [spec, handlers] = registration;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		execute: handlers.execute,
		render: handlers.render,
	};
}

export function registeredTools<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
): AnyRegisteredTool<Runtime>[] {
	// TODO: define duplicate tool-name policy at the compiler/tool lowering boundary.
	return registrations.argsFor('registerTool').map(normalizeTool);
}
