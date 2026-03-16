/**
 * Browser-safe entrypoint for @franklin/local-mcp.
 *
 * Exports only the pieces that have zero Node.js transitive dependencies.
 * The full barrel adds Node-only transports (createHttpTransport, etc.).
 */

export type {
	McpServerConfig,
	McpTransport,
	McpToolStream,
	ToolCall,
	ToolCallRequest,
	ToolCallResponse,
} from './types.js';
export type {
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
} from './tools/types.js';
export { serve, type ToolHandler } from './serve.js';
export { ToolsManager } from './tools/manager.js';
export { serializeTool } from './tools/serialize.js';
