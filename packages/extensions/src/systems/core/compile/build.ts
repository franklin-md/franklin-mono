import { createClientConnection, CtxTracker } from '@franklin/mini-acp';
import type { FullMiddleware } from '../api/middleware/types.js';
import type { SystemPromptHandler } from '../api/handlers.js';
import { createCoreRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { applyDecorators, type ProtocolDecorator } from './decorator.js';
import { createMiddlewareDecorator } from './decorators/middleware.js';
import { createTrackerDecorator } from './decorators/tracker.js';
import { createSystemPromptDecorator } from './decorators/system-prompt.js';
import { buildSystemPromptAssembler } from './builders/system-prompt.js';
import { fallbackServer } from './fallback.js';
import type { SpawnResult } from './compiler.js';

/**
 * Connect to an agent transport and apply the decorator pipeline.
 *
 * Pipeline: transport ←→ [tracker] ←→ [system-prompt?] ←→ [middleware] ←→ app
 */
export async function buildCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	middleware: FullMiddleware,
	systemPromptHandlers: SystemPromptHandler[],
): Promise<CoreRuntime> {
	const connection = createClientConnection(transport);
	const rawClient = connection.remote;

	const tracker = new CtxTracker();

	const stack: ProtocolDecorator[] = [createMiddlewareDecorator(middleware)];

	if (systemPromptHandlers.length > 0) {
		const assembler = buildSystemPromptAssembler(systemPromptHandlers);
		stack.push(createSystemPromptDecorator(assembler, tracker));
	}

	stack.push(createTrackerDecorator(state, tracker));

	const { client } = await applyDecorators(
		stack,
		{ server: fallbackServer, client: rawClient },
		async (server) => {
			connection.bind(server);
			await rawClient.initialize();
			// TODO: maybe we should run initial setContext here?
		},
	);

	// TODO: Is it possible to avoid passing in tracker?
	return createCoreRuntime(client, tracker, transport);
}
