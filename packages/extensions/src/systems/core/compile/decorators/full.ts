import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import { buildSystemPromptAssembler } from '../builders/system-prompt.js';
import type { ProtocolDecorator } from './types.js';
import { createMiddlewareDecorator } from './middleware.js';
import { createSystemPromptDecorator } from './system-prompt.js';
import { buildMiddleware } from '../middleware.js';
import { bindHandlers } from '../registrar/bind.js';
import type { CoreRegistrar } from '../registrar/types.js';
import { createTrackerDecorator } from './tracker.js';
import { createUsageTrackerDecorator } from './usage-tracker.js';
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

	stack.push(createTrackerDecorator(resources.tracker));
	stack.push(createUsageTrackerDecorator(resources.usageTracker));

	return compose(stack);
}
