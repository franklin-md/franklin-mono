import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import { buildSystemPromptAssembler } from './builders/system-prompt.js';
import type { ProtocolDecorator } from './decorator.js';
import { createMiddlewareDecorator } from './decorators/middleware.js';
import { createSystemPromptDecorator } from './decorators/system-prompt.js';
import { buildMiddleware } from './middleware.js';
import type { CoreRegistrar } from './registrar/types.js';

/**
 * Turn a `CoreRegistrar` into the ordered `ProtocolDecorator` stack
 * `buildCoreRuntime` applies to the transport. Each concern (middleware,
 * system prompt, …) becomes its own decorator; runtime binding happens
 * here via `getCtx`, threaded down into each builder.
 */
export function composeDecorators<Runtime extends BaseRuntime<unknown>>(
	registered: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator[] {
	const stack: ProtocolDecorator[] = [
		createMiddlewareDecorator(buildMiddleware(registered, getCtx)),
	];

	if (registered.systemPrompt.length > 0) {
		stack.push(
			createSystemPromptDecorator(
				buildSystemPromptAssembler(registered.systemPrompt, getCtx),
			),
		);
	}

	return stack;
}
