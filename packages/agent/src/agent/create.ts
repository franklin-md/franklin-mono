import type { Extension } from '../extensions/types/extension.js';
import type { McpTransportFactory } from '../extensions/compile/start.js';
import type { AgentTransport } from '../transport/index.js';
import type { Agent } from './types.js';
import { compileExtension } from '../extensions/compile/index.js';
import { composeAll } from '../middleware/compose.js';
import { emptyMiddleware } from '../middleware/empty.js';
import { joinCommands, joinEvents } from '../middleware/join.js';
import { fillHandler } from '../stack/fill-handler.js';
import { createAgentConnection } from '../connection.js';

/**
 * Create a typed agent by compiling extensions and connecting a transport.
 *
 * Each extension is compiled into middleware (registering tools, hooks,
 * etc.) and the resulting middlewares are composed over the transport
 * connection. Stateful extension stores are attached at `agent.<name>`.
 *
 * ```ts
 * const agent = await createAgent(
 *   [todoExt, convExt],
 *   transport,
 *   framework.toolTransport,
 * );
 *
 * agent.prompt(...);        // AgentCommands
 * agent.todo.get();         // Store<Todo[]>
 * agent.conversation.get(); // Store<ConversationTurn[]>
 * ```
 */
export async function createAgent<const E extends readonly Extension<any>[]>(
	extensions: E,
	transport: AgentTransport,
	toolTransport: McpTransportFactory,
): Promise<Agent<E>> {
	// Compile each extension into middleware.
	const middlewares = await Promise.all(
		extensions.map((ext) => compileExtension(ext, toolTransport)),
	);

	const middleware =
		middlewares.length > 0 ? composeAll(middlewares) : emptyMiddleware;

	// Create the ACP connection with middleware-wrapped events.
	const handler = fillHandler({});
	const wrappedHandler = joinEvents(middleware, handler);
	const connection = createAgentConnection(transport, wrappedHandler);
	const commands = joinCommands(middleware, connection.commands);

	// Build the agent object: commands + lifecycle + extension stores.
	const agent: Record<string, unknown> = {
		...commands,
		dispose: async () => {
			await middleware.dispose?.();
			await connection.dispose();
		},
		signal: connection.signal,
		closed: connection.closed,
	};

	// Attach each stateful extension's store at agent.<name>.
	for (const ext of extensions) {
		if (ext.state) {
			agent[ext.name] = ext.state;
		}
	}

	return agent as Agent<E>;
}
