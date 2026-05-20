import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../../api/api.js';
import { bindRegisteredEventHandlers } from '../registrations/index.js';
import type { CoreResources } from '../resources.js';
import { compose } from './compose.js';
import {
	buildMiddleware,
	createMiddlewareDecorator,
} from './middleware/index.js';
import {
	buildSystemPromptAssembler,
	createSystemPromptDecorator,
} from './system-prompt/index.js';
import {
	createContextTrackerDecorator,
	createUsageTrackerDecorator,
} from './trackers/index.js';
import type { ProtocolDecorator } from './types.js';

/**
 * Turn core extension registrations into the ordered `ProtocolDecorator` stack
 * composed around the connected Mini-ACP client/server pair. Each concern
 * (middleware, system prompt, …) becomes its own decorator; runtime access
 * is wired through `getCtx` here so builders do not construct runtimes.
 */
export function createAgentDecorator<Runtime extends BaseRuntime>(
	resources: CoreResources,
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	const stack: ProtocolDecorator[] = [];

	stack.push(createMiddlewareDecorator(buildMiddleware(registrations, getCtx)));

	const systemPromptHandlers = bindRegisteredEventHandlers(
		registrations,
		'systemPrompt',
		getCtx,
	);
	if (systemPromptHandlers.length > 0) {
		stack.push(
			createSystemPromptDecorator(
				buildSystemPromptAssembler(systemPromptHandlers),
			),
		);
	}

	stack.push(createContextTrackerDecorator(resources.tracker));
	stack.push(createUsageTrackerDecorator(resources.usageTracker));

	return compose(stack);
}
