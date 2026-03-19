import type { Extension } from './extensions/types/index.js';
import type { McpTransportFactory } from './extensions/compile/start.js';
import type { AgentMiddleware } from './types.js';
import type { AgentTransport } from './transport/index.js';
import type { AgentConnection } from './connection.js';
import { compileExtension } from './extensions/compile/index.js';
import { fillHandler } from './stack/fill-handler.js';
import { createAgentConnection } from './connection.js';

// ---------------------------------------------------------------------------
// Framework — abstract base for Node and Electron frameworks
// ---------------------------------------------------------------------------

/**
 * Base class for framework implementations.
 *
 * Provides `compileExtensions` and `connect` so that consumers don't
 * need to manually wire middleware, events, connections, and commands.
 * Subclasses provide the concrete `toolTransport` and environment lifecycle.
 */
export abstract class Framework {
	/** MCP transport factory used to serve extension tools. */
	abstract get toolTransport(): McpTransportFactory;

	/**
	 * Compile a list of extensions into a single transport-wrapping middleware.
	 *
	 * Each extension is compiled against this framework's `toolTransport`,
	 * then all resulting middlewares are composed. Extensions listed first
	 * are inner (closer to the agent).
	 */
	async compileExtensions(
		extensions: readonly Extension[],
	): Promise<AgentMiddleware> {
		const mws = await Promise.all(
			extensions.map((ext) => compileExtension(ext, this.toolTransport)),
		);
		return mws.reduce<AgentMiddleware>(
			(composed, mw) => (t) => mw(composed(t)),
			(t) => t,
		);
	}

	/**
	 * Connect a transport, returning an AgentConnection.
	 *
	 * The consumer wraps the transport with middleware before calling:
	 *
	 *     framework.connect(middleware(transport))
	 */
	connect(transport: AgentTransport): AgentConnection {
		return createAgentConnection(transport, fillHandler({}));
	}
}
