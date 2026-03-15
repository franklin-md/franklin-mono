import { PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';

import { createAgentConnection } from './connection.js';
import type { AgentRegistry, AgentSpec } from './registry.js';
import type { AgentCommands, AgentEvents } from './stack/types.js';
import type { Middleware } from './stack/index.js';
import {
	emptyMiddleware,
	joinCommands,
	joinEvents,
	sequence,
} from './stack/index.js';
import { EVENT_METHODS } from './middleware/types.js';
import { StdioTransport } from './transport/index.js';
import type { Transport } from './transport/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fills a partial event handler with defaults that throw methodNotFound.
 */
function fillHandler(handler: Partial<AgentEvents>): AgentEvents {
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

/**
 * Composes an array of middlewares into a single middleware via sequence().
 */
function composeAll(middlewares: Middleware[]): Middleware {
	return middlewares.reduce((acc, mw) => sequence(acc, mw), emptyMiddleware);
}

// ---------------------------------------------------------------------------
// Options + result
// ---------------------------------------------------------------------------

export interface SpawnOptions {
	/** Agent name (looked up in registry) or raw AgentSpec. */
	agent: string | AgentSpec;
	/** Working directory for the session. */
	cwd: string;
	/** Middleware stack (outermost first). */
	middlewares?: Middleware[];
	/** App's inbound event handlers (sessionUpdate, requestPermission, etc.). */
	handler: Partial<AgentEvents>;
	/** Override env vars merged with the agent spec. */
	env?: Record<string, string>;
}

export interface AgentSession {
	/** The agent commands handle. */
	commands: AgentCommands;
	/** The session ID from newSession. */
	sessionId: string;
	/** Dispose the underlying connection. */
	dispose(): Promise<void>;
}

export type SpawnResult = AgentSession;

// ---------------------------------------------------------------------------
// spawn() — full lifecycle: transport → compose → init → session
// ---------------------------------------------------------------------------

/**
 * Spawns an ACP agent subprocess and returns a fully initialized stack.
 *
 * @param registry - The agent registry for name resolution.
 * @param options  - Agent spec (string or object), cwd, middlewares, handler.
 */
export async function spawn(
	registry: AgentRegistry,
	options: SpawnOptions,
): Promise<AgentSession> {
	const spec =
		typeof options.agent === 'string'
			? registry.get(options.agent)
			: options.agent;

	const transport = new StdioTransport({
		...spec,
		cwd: options.cwd,
		env: options.env ? { ...spec.env, ...options.env } : spec.env,
	});

	return spawnFromTransport(transport, options);
}

// ---------------------------------------------------------------------------
// spawnFromTransport() — compose + init + session on a transport
// ---------------------------------------------------------------------------

export interface SpawnFromTransportOptions {
	/** Working directory for the session. */
	cwd: string;
	/** Middleware stack (outermost first). */
	middlewares?: Middleware[];
	/** App's inbound event handlers. */
	handler: Partial<AgentEvents>;
}

/**
 * Composes middleware, creates a connection, initializes, and creates a
 * session on the given transport. Useful for testing with in-memory transports.
 */
export async function spawnFromTransport(
	transport: Transport,
	options: SpawnFromTransportOptions,
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
