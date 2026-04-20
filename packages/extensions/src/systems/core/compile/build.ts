import { createClientConnection, CtxTracker } from '@franklin/mini-acp';
import { createCoreRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { applyDecorators, type ProtocolDecorator } from './decorator.js';
import { createTrackerDecorator } from './decorators/tracker.js';
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
 *
 * After decorator wrapping completes, an explicit bootstrap `setContext`
 * seeds the agent with the initial ctx. Routing it through the fully
 * wrapped client means any middleware (e.g. tool injection) sees the
 * bootstrap, and `trackClient` mirrors it into the tracker.
 */
export async function buildCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	extensionDecorators: readonly ProtocolDecorator[],
): Promise<CoreRuntime> {
	const connection = createClientConnection(transport);
	const rawClient = connection.remote;

	const tracker = new CtxTracker();

	const stack: ProtocolDecorator[] = [
		...extensionDecorators,
		createTrackerDecorator(tracker),
	];

	const { client } = await applyDecorators(
		stack,
		{ server: fallbackServer, client: rawClient },
		async (server) => {
			connection.bind(server);
			await rawClient.initialize();
		},
	);

	// Seed agent + tracker with initial state. systemPrompt is always '' —
	// handlers own it via the system-prompt decorator.
	const core = state.core;
	await client.setContext({
		history: { systemPrompt: '', messages: [...core.messages] },
		tools: [],
		config: { ...core.llmConfig },
	});

	// TODO: Is it possible to avoid passing in tracker?
	return createCoreRuntime(client, tracker, transport);
}
