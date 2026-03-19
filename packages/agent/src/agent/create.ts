import type { Extension } from '../extensions/types/extension.js';
import type { McpTransportFactory } from '../extensions/compile/start.js';
import type { AgentTransport } from '../transport/index.js';
import type { AgentMiddleware } from '../types.js';
import type { Agent } from './types.js';
import { compileExtension } from '../extensions/compile/index.js';
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
	// Compile each extension into transport-wrapping middleware.
	const mws = await Promise.all(
		extensions.map((ext) => compileExtension(ext, toolTransport)),
	);

	// Compose: extensions listed first are inner (closer to agent).
	const middleware = mws.reduce<AgentMiddleware>(
		(composed, mw) => (t) => mw(composed(t)),
		(t) => t,
	);

	// Apply middleware to transport and create connection.
	const wrapped = middleware(transport);
	const connection = createAgentConnection(wrapped, fillHandler({}));

	// Build the agent object: commands + lifecycle + extension stores.
	const agent: Record<string, unknown> = {
		...connection.commands,
		dispose: async () => {
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
