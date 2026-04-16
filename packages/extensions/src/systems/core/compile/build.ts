import { createClientConnection } from '@franklin/mini-acp';
import type { FullMiddleware } from '../api/middleware/types.js';
import { createCoreRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { applyDecorators } from './decorator.js';
import { createMiddlewareDecorator } from './decorators/middleware.js';
import { createTrackerDecorator } from './decorators/tracker.js';
import { fallbackServer } from './fallback.js';
import type { SpawnResult } from './compiler.js';

/**
 * Connect to an agent transport and apply the decorator pipeline.
 *
 * Pipeline: transport ←→ [tracker] ←→ [middleware] ←→ app
 */
export async function buildCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	middleware: FullMiddleware,
): Promise<CoreRuntime> {
	const connection = createClientConnection(transport);
	const rawClient = connection.remote;

	const { decorator: trackerDecorator, tracker } =
		createTrackerDecorator(state);

	// Stack ordered innermost → outermost (for server side).
	const { client } = await applyDecorators(
		[createMiddlewareDecorator(middleware), trackerDecorator],
		{ server: fallbackServer, client: rawClient },
		async (server) => {
			connection.bind(server);
			await rawClient.initialize();
		},
	);

	return createCoreRuntime(client, tracker, transport);
}
