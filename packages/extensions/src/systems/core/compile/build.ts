import {
	createClientConnection,
	CtxTracker,
	type ToolDefinition as SerializedToolDefinition,
} from '@franklin/mini-acp';
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
 * seeds the agent with the initial ctx — history, extension-registered
 * tools, and LLM config. The tool list is authoritative for the session:
 * it is set once here and never mutated by the extension layer after.
 */
export async function buildCoreRuntime(
	transport: SpawnResult,
	state: CoreState,
	extensionDecorators: readonly ProtocolDecorator[],
	tools: readonly SerializedToolDefinition[],
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
		tools: [...tools],
		config: { ...core.llmConfig },
	});

	// TODO: Is it possible to avoid passing in tracker?
	return createCoreRuntime(client, tracker, transport);
}
