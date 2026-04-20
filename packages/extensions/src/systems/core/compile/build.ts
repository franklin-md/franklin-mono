import {
	createClientConnection,
	CtxTracker,
	UsageTracker,
} from '@franklin/mini-acp';
import { createCoreRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { applyDecorators, type ProtocolDecorator } from './decorator.js';
import { createTrackerDecorator } from './decorators/tracker.js';
import { createUsageTrackerDecorator } from './decorators/usage-tracker.js';
import { fallbackServer } from './fallback.js';
import type { SpawnResult } from './compiler.js';

/**
 * Connect to an agent transport and apply the decorator pipeline.
 *
 * `extensionDecorators` is the stack composed by `composeDecorators`
 * (middleware, system prompt, …); the tracker decorator is appended
 * here since it's transport infrastructure, not extension data.
 *
 * Pipeline: transport ←→ [tracker] ←→ [extension stack…] ←→ app
 */
export async function buildCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	extensionDecorators: readonly ProtocolDecorator[],
): Promise<CoreRuntime> {
	const connection = createClientConnection(transport);
	const rawClient = connection.remote;

	const tracker = new CtxTracker();
	const usageTracker = new UsageTracker();
	usageTracker.add(state.core.usage);

	const stack: ProtocolDecorator[] = [
		...extensionDecorators,
		createTrackerDecorator(state, tracker),
		createUsageTrackerDecorator(usageTracker),
	];

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
	return createCoreRuntime(client, tracker, usageTracker, transport);
}
