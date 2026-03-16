import type { McpTransport } from '@franklin/local-mcp';
import { serve } from '@franklin/local-mcp';

import type { ExtensionToolDefinition } from '../types/index.js';

// ---------------------------------------------------------------------------
// McpTransportFactory
// ---------------------------------------------------------------------------

/**
 * Factory that creates an MCP transport for a set of tool definitions.
 * Tests use in-memory, production uses HTTP relay.
 */
export type McpTransportFactory = (
	tools: ExtensionToolDefinition[],
) => Promise<McpTransport>;

// ---------------------------------------------------------------------------
// startTransport — create transport and wire tool dispatch
// ---------------------------------------------------------------------------

export async function startTransport(
	extensionName: string,
	tools: ExtensionToolDefinition[],
	factory: McpTransportFactory,
): Promise<McpTransport> {
	const transport = await factory(tools);

	const toolMap = new Map(tools.map((t) => [t.name, t]));
	serve(transport.stream, async (request) => {
		const tool = toolMap.get(request.tool);
		if (!tool) {
			throw new Error(`[${extensionName}] Unknown tool: ${request.tool}`);
		}
		return await tool.execute(request.arguments);
	});

	return transport;
}
