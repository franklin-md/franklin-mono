import {
	type MiniACPAgent,
	createClientConnection,
	type ClientProtocol,
} from '@franklin/mini-acp';
import type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
} from '@franklin/extensions';
import {
	compileAll,
	combine,
	createCoreCompiler,
	createStoreCompiler,
	apply,
} from '@franklin/extensions';
import type { Agent } from './types.js';

/**
 * Create a typed agent by compiling extensions and wrapping a mini-acp client.
 *
 * Extensions are compiled via `compileAll` (fold with merge), producing
 * middleware for the client side (command interception) and server side
 * (tool execution). The client is wrapped with middleware; the server
 * middleware produces a `toolExecute` handler for the protocol to call.
 *
 * For child agents, pass `existingStores` from `parent.stores.share()`
 * to inherit state per store sharing semantics. When omitted, the agent
 * compiles against a fresh empty store result with its own pool.
 */
export async function createAgent(
	extensions: Extension<CoreAPI & StoreAPI>[],
	transport: ClientProtocol,
	existingStores: StoreResult,
): Promise<Agent> {
	const result = await compileAll(
		combine(
			createCoreCompiler(),
			createStoreCompiler(existingStores),
		),
		extensions,
	);

	// Wrap tool execution with server middleware.
	// Default handler returns an error for unknown tools.
	const defaultAgent: MiniACPAgent = {
		toolExecute: async (params) => ({
			toolCallId: params.call.id,
			content: [
				{
					type: 'text',
					text: `Unknown tool: ${params.call.name}`,
				},
			],
			isError: true,
		}),
	};
	// Wrap outgoing commands with client middleware
	const wrappedAgent = apply(result.server, defaultAgent);
	const { remote, bind } = createClientConnection(transport);
	bind(wrappedAgent);
	const wrappedClient = apply(result.client, remote);

	const controller = new AbortController();

	return {
		...wrappedClient,
		stores: result.stores,
		dispose: async () => {
			controller.abort();
		},
	};
}
