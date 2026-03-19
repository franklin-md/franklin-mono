import type { Extension } from './extensions/types/index.js';
import type { McpTransportFactory } from './extensions/compile/start.js';
import type { Middleware } from './middleware/types.js';
import type { AgentTransport } from './transport/index.js';
import type { AgentConnection } from './connection.js';
import { emptyMiddleware } from './middleware/empty.js';
import { compileExtension } from './extensions/compile/index.js';
import { composeAll } from './middleware/compose.js';
import { joinCommands, joinEvents } from './middleware/join.js';
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
	 * Compile a list of extensions into a single middleware.
	 *
	 * Each extension is compiled against this framework's `toolTransport`,
	 * then all resulting middlewares are sequenced into one.
	 */
	async compileExtensions(
		extensions: readonly Extension<any>[],
	): Promise<Middleware> {
		const mws = await Promise.all(
			extensions.map((ext) => compileExtension(ext, this.toolTransport)),
		);
		return composeAll(mws);
	}

	/**
	 * Connect a transport through middleware, returning an AgentConnection.
	 *
	 * The returned connection has the same shape as a raw connection but
	 * with commands wrapped through middleware and an empty terminal handler.
	 * Supports zero middleware (pass nothing or an empty array).
	 */
	connect(
		transport: AgentTransport,
		...middlewares: Middleware[]
	): AgentConnection {
		const middleware =
			middlewares.length > 0 ? composeAll(middlewares) : emptyMiddleware;

		const handler = fillHandler({});
		const wrappedHandler = joinEvents(middleware, handler);
		const connection = createAgentConnection(transport, wrappedHandler);
		const commands = joinCommands(middleware, connection.commands);

		return {
			commands,
			signal: connection.signal,
			closed: connection.closed,
			dispose: async () => {
				await middleware.dispose?.();
				await connection.dispose();
			},
		};
	}
}
