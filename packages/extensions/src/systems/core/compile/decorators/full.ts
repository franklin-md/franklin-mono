import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import { bindHandlers } from '../registrar/bind.js';
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
 * `createCoreRuntime` composes over the transport. Each concern
 * (middleware, system prompt, …) becomes its own decorator; runtime
 * binding happens here via `bindHandlers`/`bindTool`, so each builder's
 * signature stays runtime-agnostic.
 */
export function createAgentDecorator<Runtime extends BaseRuntime>(
	resources: CoreResources,
	registrations: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	const stack: ProtocolDecorator[] = [];

	stack.push(createMiddlewareDecorator(buildMiddleware(registrations, getCtx)));

	if (registrations.systemPrompt.length > 0) {
		const handlers = bindHandlers(registrations.systemPrompt, getCtx);
		stack.push(
			createSystemPromptDecorator(buildSystemPromptAssembler(handlers)),
		);
	}

	stack.push(createContextTrackerDecorator(resources.tracker));
	stack.push(createUsageTrackerDecorator(resources.usageTracker));

	return compose(stack);
}
