import { bindAllWithRuntime, type BaseRuntime } from '@franklin/extensibility';
import type { CoreRegistrar } from '../registrar/types.js';
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
 * Turn a `CoreRegistrar` into the ordered `ProtocolDecorator` stack
 * composed around the connected Mini-ACP client/server pair. Each concern
 * (middleware, system prompt, …) becomes its own decorator; runtime access
 * is wired through `getCtx` here so builders do not construct runtimes.
 */
export function createAgentDecorator<Runtime extends BaseRuntime>(
	resources: CoreResources,
	registrations: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	const stack: ProtocolDecorator[] = [];

	stack.push(createMiddlewareDecorator(buildMiddleware(registrations, getCtx)));

	if (registrations.systemPrompt.length > 0) {
		const handlers = bindAllWithRuntime(registrations.systemPrompt, getCtx);
		stack.push(
			createSystemPromptDecorator(buildSystemPromptAssembler(handlers)),
		);
	}

	stack.push(createContextTrackerDecorator(resources.tracker));
	stack.push(createUsageTrackerDecorator(resources.usageTracker));

	return compose(stack);
}
