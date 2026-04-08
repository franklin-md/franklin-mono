import {
	trackAgent,
	trackClient,
	createClientConnection,
	type CtxTracker,
	type ClientProtocol,
	type MiniACPClient,
	type MiniACPAgent,
} from '@franklin/mini-acp';
import { apply } from '../../api/core/middleware/apply.js';
import type { FullMiddleware } from '../../api/core/middleware/types.js';

export type SpawnResult = ClientProtocol & { dispose(): Promise<void> };

const defaultAgent: MiniACPAgent = {
	toolExecute: async (params) => ({
		toolCallId: params.call.id,
		content: [{ type: 'text', text: `Unknown tool: ${params.call.name}` }],
		isError: true,
	}),
};

/**
 * Create a raw client connection to the transport and bind
 * the server middleware. Wraps the agent binding with trackAgent
 * so the client-side tracker sees tool calls and results.
 */
export function createRawClient(
	transport: ClientProtocol,
	serverMiddleware: FullMiddleware['server'],
	tracker: CtxTracker,
): MiniACPClient {
	const wrappedAgent = apply(serverMiddleware, defaultAgent);
	const connection = createClientConnection(transport);
	connection.bind(trackAgent(tracker, wrappedAgent));
	return connection.remote;
}

/**
 * Wrap a raw client with tracker interception and client middleware.
 * Used after seeding to create the client for ongoing operations.
 */
export function wrapClient(
	rawClient: MiniACPClient,
	tracker: CtxTracker,
	clientMiddleware: FullMiddleware['client'],
): MiniACPClient {
	return apply(clientMiddleware, trackClient(tracker, rawClient));
}
