/**
 * Browser-safe entrypoint for @franklin/local-mcp.
 *
 * Exports only the pieces that have zero Node.js transitive dependencies.
 * The full barrel adds Node-only transports (createHttpTransport, etc.).
 */

export type { McpServerConfig, LocalMcpTransport } from './types.js';
export type {
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
} from './tools/types.js';
export { ToolsManager } from './tools/manager.js';
export { serializeTool } from './tools/serialize.js';
