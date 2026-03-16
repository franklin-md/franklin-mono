import type { McpTransportFactory } from '@franklin/agent/browser';
import type {
	McpServerConfig,
	McpToolStream,
	McpTransport,
	SerializedToolDefinition,
	ToolCallRequest,
	ToolCallResponse,
} from '@franklin/local-mcp';
import { serve } from '@franklin/local-mcp';
import type { MuxPacket } from '@franklin/transport';
import { Multiplexer } from '@franklin/transport';

import { MCP_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';

import type { ExtensionToolDefinition } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 MCP multiplexer
// ---------------------------------------------------------------------------

// Renderer reads requests from main, writes responses to main
let mcpMux: Multiplexer<ToolCallRequest, ToolCallResponse> | null = null;

function getMcpMux(): Multiplexer<ToolCallRequest, ToolCallResponse> {
	if (!mcpMux) {
		const mcpChannel = createIpcStream<
			MuxPacket<ToolCallRequest>,
			MuxPacket<ToolCallResponse>
		>(MCP_STREAM);
		mcpMux = new Multiplexer(mcpChannel);
	}
	return mcpMux;
}

// ---------------------------------------------------------------------------
// serializeToolForIpc — strip non-serializable fields for IPC
// ---------------------------------------------------------------------------

function serializeToolForIpc(
	tool: ExtensionToolDefinition,
): SerializedToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema:
			'toJsonSchema' in tool.schema
				? (
						tool.schema as unknown as {
							toJsonSchema: () => Record<string, unknown>;
						}
					).toJsonSchema()
				: {},
	};
}

// ---------------------------------------------------------------------------
// createIpcMcpTransport — McpTransportFactory for Electron renderer
// ---------------------------------------------------------------------------

/**
 * MCP transport factory that proxies tool calls over Electron IPC.
 *
 * When called:
 * 1. Generates a unique mcpId (UUID)
 * 2. Asks main to create an HTTP server + relay config
 * 3. Sets up a Level 2 IPC stream for tool call dispatch
 * 4. Runs serve() on the IPC stream to handle tool calls in the renderer
 *
 * Tool calls flow: agent -> HTTP POST (main) -> IPC -> renderer (serve)
 * Results flow:    renderer -> IPC -> main (HTTP response) -> agent
 */
export const createIpcMcpTransport: McpTransportFactory = async (
	tools: ExtensionToolDefinition[],
): Promise<McpTransport> => {
	const mcpId = crypto.randomUUID();
	const serializedTools = tools.map(serializeToolForIpc);

	// Ask main to create HTTP server + relay config
	const config = (await window.__franklinBridge.mcp.start(
		mcpId,
		serializedTools,
	)) as McpServerConfig;

	// Level 2: per-mcpId IPC stream for tool call dispatch
	const stream: McpToolStream = getMcpMux().channel(mcpId);

	// Wire up tool dispatch — serve() reads requests, calls tool, writes responses
	const toolMap = new Map(tools.map((t) => [t.name, t]));
	serve(stream, async (request) => {
		const tool = toolMap.get(request.tool);
		if (!tool) throw new Error(`Unknown tool: "${request.tool}"`);
		return await tool.execute(request.arguments);
	});

	return {
		config,
		stream,
		dispose: async () => {
			await stream.close();
			await window.__franklinBridge.mcp.stop(mcpId);
		},
	};
};
