import type {
	McpTransport,
	SerializedToolDefinition,
} from '@franklin/local-mcp';
import { serve } from '@franklin/local-mcp';

import type { ExtensionToolDefinition } from '../types/index.js';

// ---------------------------------------------------------------------------
// McpTransportFactory
// ---------------------------------------------------------------------------

/**
 * Factory that creates an MCP transport for a set of tool definitions.
 * The extensionName is used to produce a unique MCP server name so that
 * multiple extensions don't collide when both inject into mcpServers.
 * Tests use in-memory, production uses HTTP relay.
 */
export type McpTransportFactory = (
	name: string, // Name of the Group
	tools: SerializedToolDefinition[],
) => Promise<McpTransport>;

// ---------------------------------------------------------------------------
// startTransport — create transport and wire tool dispatch
// ---------------------------------------------------------------------------

export async function startTransport(
	name: string,
	tools: ExtensionToolDefinition[],
	transport: McpTransport,
): Promise<void> {
	const toolMap = new Map(tools.map((t) => [t.name, t]));
	serve(transport.stream, async (request) => {
		const tool = toolMap.get(request.tool);
		if (!tool) {
			throw new Error(`[${name}] Unknown tool: ${request.tool}`);
		}
		return await tool.execute(request.arguments);
	});
}
