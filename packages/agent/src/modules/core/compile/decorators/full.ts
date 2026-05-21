import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../../api/api.js';
import type { CoreResources } from '../resources.js';
import { createAgentObserverDecorator } from './agent-observer/index.js';
import { compose } from './compose.js';
import { createPromptDecorator } from './prompt/index.js';
import { createSystemPromptDecorator } from './system-prompt/index.js';
import { createToolDecorator } from './tool/index.js';
import { createTrackingDecorator } from './tracking/index.js';
import type { ProtocolDecorator } from './types.js';

/**
 * Turn core extension registrations into the ordered `ProtocolDecorator` stack
 * composed around the connected Mini-ACP client/server pair. Each concern
 * (prompt, observer, tool, system prompt, tracking) becomes its own decorator;
 * runtime access is wired through `getCtx` here so builders do not construct
 * runtimes.
 */
export function createAgentDecorator<Runtime extends BaseRuntime>(
	resources: CoreResources,
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	return compose(
		[
			createPromptDecorator(registrations, getCtx),
			createAgentObserverDecorator(registrations, getCtx),
			createToolDecorator(registrations, getCtx),
			createSystemPromptDecorator(registrations, getCtx),
			createTrackingDecorator(resources),
		].filter(isProtocolDecorator),
	);
}

function isProtocolDecorator(
	decorator: ProtocolDecorator | undefined,
): decorator is ProtocolDecorator {
	return decorator !== undefined;
}
