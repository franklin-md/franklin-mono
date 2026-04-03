import type { CtxTracker } from '@franklin/mini-acp';
import {
	createClientConnection,
	type ClientProtocol,
	type MiniACPClient,
	type MiniACPAgent,
	type StreamEvent,
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
 * the server middleware. Returns the raw (unwrapped) client.
 */
export function createRawClient(
	transport: ClientProtocol,
	serverMiddleware: FullMiddleware['server'],
): MiniACPClient {
	const wrappedAgent = apply(serverMiddleware, defaultAgent);
	const connection = createClientConnection(transport);
	connection.bind(wrappedAgent);
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
	const tracked = trackClient(rawClient, tracker);
	return apply(clientMiddleware, tracked);
}

export function trackClient(
	client: MiniACPClient,
	tracker: CtxTracker,
): MiniACPClient {
	return {
		initialize: client.initialize.bind(client),
		cancel: client.cancel.bind(client),

		async setContext(params) {
			tracker.apply(params.ctx);
			return client.setContext(params);
		},

		async *prompt(params): AsyncIterable<StreamEvent> {
			tracker.append(params.message);
			for await (const event of client.prompt(params)) {
				if (event.type === 'update') {
					tracker.append(event.message);
				}
				yield event;
			}
		},
	};
}
