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
import type { MultiplexedPacket } from '@franklin/transport';
import {
	createMultiplexedEventStream,
	streamToEventInterface,
} from '@franklin/transport';

import { MCP_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';

import type { ExtensionToolDefinition } from '@franklin/agent/browser';

// ---------------------------------------------------------------------------
// Lazy singleton for Level 1 MCP channel + mux
// ---------------------------------------------------------------------------

type McpMessage = MultiplexedPacket<ToolCallRequest | ToolCallResponse>;

let mcpMux: ReturnType<typeof streamToEventInterface<McpMessage>> | null = null;

function getMcpMux() {
	if (!mcpMux) {
		const mcpChannel = createIpcStream<McpMessage>(MCP_STREAM);
		mcpMux = streamToEventInterface(mcpChannel);
	}
	return mcpMux;
}

// ---------------------------------------------------------------------------
// serializeToolForIpc — strip non-serializable fields for IPC
// ---------------------------------------------------------------------------

function serializeToolForIpc(
	tool: ExtensionToolDefinition,
): SerializedToolDefinition {
	// Import serializeTool from local-mcp would pull Zod — just inline the shape
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
 * Tool calls flow: agent → HTTP POST (main) → IPC → renderer (serve)
 * Results flow:    renderer → IPC → main (HTTP response) → agent
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
	const stream = createMultiplexedEventStream<
		ToolCallRequest | ToolCallResponse
	>(mcpId, getMcpMux());

	// Wire up tool dispatch — serve() reads requests, calls tool, writes responses
	const toolMap = new Map(tools.map((t) => [t.name, t]));
	serve(stream as unknown as McpToolStream, async (request) => {
		const tool = toolMap.get(request.tool);
		if (!tool) throw new Error(`Unknown tool: "${request.tool}"`);
		return await tool.execute(request.arguments);
	});

	return {
		config,
		stream: stream as unknown as McpToolStream,
		dispose: async () => {
			await stream.close();
			await window.__franklinBridge.mcp.stop(mcpId);
		},
	};
};
