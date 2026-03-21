import type { McpTransportFactory } from './extensions/compile/start.js';

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
}
