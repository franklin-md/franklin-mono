import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

import type { AgentConnection } from './connection.js';
import type { AgentRegistry, AgentSpec } from './registry.js';
import type { AgentStack, Middleware } from './stack.js';
import { compose } from './stack.js';
import { StdioTransport } from './transport/index.js';

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
	/** App's inbound handlers (sessionUpdate, requestPermission, etc.). */
	handler: Partial<AgentStack>;
	/** Override env vars merged with the agent spec. */
	env?: Record<string, string>;
}

export interface AgentSession {
	/** The composed middleware stack — use for outbound calls. */
	stack: AgentStack;
	/** The session ID from newSession. */
	sessionId: string;
}

export type SpawnResult = AgentSession;

// ---------------------------------------------------------------------------
// spawn() — full lifecycle: transport → connection → compose → init → session
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

	const { AgentConnection: Conn } = await import('./connection.js');
	const connection = new Conn(transport);

	return spawnFromConnection(connection, options);
}

// ---------------------------------------------------------------------------
// spawnFromConnection() — compose + init + session on an existing connection
// ---------------------------------------------------------------------------

export interface SpawnFromConnectionOptions {
	/** Working directory for the session. */
	cwd: string;
	/** Middleware stack (outermost first). */
	middlewares?: Middleware[];
	/** App's inbound handlers. */
	handler: Partial<AgentStack>;
}

/**
 * Composes middleware, initializes, and creates a session on an existing
 * connection. Useful for testing with in-memory transports.
 */
export async function spawnFromConnection(
	connection: AgentConnection,
	options: SpawnFromConnectionOptions,
): Promise<AgentSession> {
	const stack = compose(connection, options.middlewares ?? [], options.handler);

	await stack.initialize({
		protocolVersion: PROTOCOL_VERSION,
		clientCapabilities: {},
	});

	const { sessionId } = await stack.newSession({
		cwd: options.cwd,
		mcpServers: [],
	});

	return { stack, sessionId };
}
