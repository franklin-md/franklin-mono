import { PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';

import { createAgentConnection } from './connection.js';
import type { AgentCommands, AgentEvents } from './types.js';
import type { Middleware } from './stack/index.js';
import {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
} from './stack/index.js';
import { EVENT_METHODS } from './stack/index.js';
import type { AgentTransport } from './transport/index.js';

export function fillHandler(handler: Partial<AgentEvents>): AgentEvents {
	const result: Record<string, unknown> = {};
	for (const method of EVENT_METHODS) {
		result[method] =
			handler[method] ??
			(() => {
				throw RequestError.methodNotFound(method);
			});
	}
	return result as unknown as AgentEvents;
}

export function composeAll(middlewares: readonly Middleware[]): Middleware {
	return middlewares.reduce((acc, mw) => sequence(acc, mw), emptyMiddleware);
}

export interface SpawnOptions {
	cwd: string;
	middlewares?: Middleware[];
	handler: Partial<AgentEvents>;
}

export interface AgentSession {
	commands: AgentCommands;
	sessionId: string;
	dispose(): Promise<void>;
}

/**
 * Composes middleware, creates a connection, initializes, and creates a
 * session on the given transport.
 */
export async function spawn(
	transport: AgentTransport,
	options: SpawnOptions,
): Promise<AgentSession> {
	const composed = composeAll(options.middlewares ?? []);
	const handler = fillHandler(options.handler);
	const composedHandler = joinEvents(composed, handler);
	const conn = createAgentConnection(transport, composedHandler);
	const commands = joinCommands(composed, conn.commands);

	await commands.initialize({
		protocolVersion: PROTOCOL_VERSION,
		clientCapabilities: {},
	});

	const { sessionId } = await commands.newSession({
		cwd: options.cwd,
		mcpServers: [],
	});

	return { commands, sessionId, dispose: () => conn.dispose() };
}
