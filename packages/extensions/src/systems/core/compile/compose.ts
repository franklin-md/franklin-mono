import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import { buildSystemPromptAssembler } from './builders/system-prompt.js';
import type { ProtocolDecorator } from './decorators/types.js';
import { createMiddlewareDecorator } from './decorators/middleware.js';
import { createSystemPromptDecorator } from './decorators/system-prompt.js';
import { buildMiddleware } from './middleware.js';
import { bindHandlers } from './registrar/bind.js';
import type { CoreRegistrar } from './registrar/types.js';

/**
 * Turn a `CoreRegistrar` into the ordered `ProtocolDecorator` stack
 * `createCoreRuntime` composes over the transport. Each concern
 * (middleware, system prompt, …) becomes its own decorator; runtime
 * binding happens here via `bindHandlers`/`bindTool`, so each builder's
 * signature stays runtime-agnostic.
 */
export function composeDecorators<Runtime extends BaseRuntime<unknown>>(
	registered: CoreRegistrar<Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator[] {
	const stack: ProtocolDecorator[] = [
		createMiddlewareDecorator(buildMiddleware(registered, getCtx)),
	];

	if (registered.systemPrompt.length > 0) {
		const handlers = bindHandlers(registered.systemPrompt, getCtx);
		stack.push(
			createSystemPromptDecorator(buildSystemPromptAssembler(handlers)),
		);
	}

	return stack;
}
