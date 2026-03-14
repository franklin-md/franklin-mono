/**
 * Browser-safe entrypoint for @franklin/local-mcp.
 *
 * Exports only the pieces that have zero Node.js transitive dependencies.
 * The full barrel adds Node-only transports (HttpLocalMcpTransport, etc.).
 */

export { createLocalMcp } from './local-mcp.js';
export type { LocalMcp } from './local-mcp.js';
export type {
	LocalMcpOptions,
	McpServerConfig,
	LocalMcpTransport,
} from './types.js';
export type {
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
} from './tools/types.js';
export { ToolsManager } from './tools/manager.js';
export { serializeTool } from './tools/serialize.js';
