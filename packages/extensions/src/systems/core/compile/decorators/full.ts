import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import type { ProtocolDecorator } from './types.js';
import {
	buildMiddleware,
	createMiddlewareDecorator,
} from './middleware/index.js';
import {
	buildSystemPromptAssembler,
	createSystemPromptDecorator,
} from './system-prompt/index.js';
import { bindHandlers } from '../registrar/bind.js';
import type { CoreRegistrar } from '../registrar/types.js';
import {
	createContextTrackerDecorator,
	createUsageTrackerDecorator,
} from './trackers/index.js';
import type { CoreResources } from '../resources.js';
import { compose } from './compose.js';

/**
 * Turn a `CoreRegistrar` into the ordered `ProtocolDecorator` stack
 * `createCoreRuntime` composes over the transport. Each concern
 * (middleware, system prompt, …) becomes its own decorator; runtime
 * binding happens here via `bindHandlers`/`bindTool`, so each builder's
 * signature stays runtime-agnostic.
 */
export function createAgentDecorator<Runtime extends BaseRuntime<unknown>>(
	resources: CoreResources,
	registered: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator {
	const stack: ProtocolDecorator[] = [];

	// With the registered
	stack.push(createMiddlewareDecorator(buildMiddleware(registered, getCtx)));

	if (registered.systemPrompt.length > 0) {
		const handlers = bindHandlers(registered.systemPrompt, getCtx);
		stack.push(
			createSystemPromptDecorator(buildSystemPromptAssembler(handlers)),
		);
	}

	stack.push(createContextTrackerDecorator(resources.tracker));
	stack.push(createUsageTrackerDecorator(resources.usageTracker));

	return compose(stack);
}
