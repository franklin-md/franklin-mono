import type { McpTransportFactory } from '@franklin/agent/browser';
import type {
	McpServerConfig,
	McpToolStream,
	SerializedToolDefinition,
	ToolCallRequest,
	ToolCallResponse,
} from '@franklin/local-mcp';
import type { MuxPacket } from '@franklin/transport';
import { Multiplexer } from '@franklin/transport';

import { MCP_STREAM } from '../../shared/channels.js';
import { createIpcStream } from './stream.js';

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
// createIpcMcpTransport — McpTransportFactory for Electron renderer
// ---------------------------------------------------------------------------

/**
 * MCP transport factory that proxies tool calls over Electron IPC.
 *
 * When called:
 * 1. Generates a unique mcpId (UUID)
 * 2. Asks main to create an HTTP server + relay config
 * 3. Returns a Level 2 IPC stream for tool call dispatch
 *
 * The returned stream's writable is intentionally left unlocked —
 * startTransport() in @franklin/agent wires serve() on it.
 *
 * Tool calls flow: agent -> HTTP POST (main) -> IPC -> renderer (serve)
 * Results flow:    renderer -> IPC -> main (HTTP response) -> agent
 */
export const createIpcMcpTransport: McpTransportFactory = async (
	tools: SerializedToolDefinition[],
) => {
	const mcpId = crypto.randomUUID();
	// TODO: If there is no tools, can we skip this?

	// Ask main to create HTTP server + relay config
	const config = (await window.__franklinBridge.mcp.start(
		mcpId,
		tools,
	)) as McpServerConfig;

	// Level 2: per-mcpId IPC stream for tool call dispatch
	// NOTE: Do NOT call serve() here — startTransport() in @franklin/agent
	// wires tool dispatch on the returned stream. Calling serve() twice
	// would double-lock the writable.
	const stream: McpToolStream = getMcpMux().channel(mcpId);

	return {
		config,
		stream,
		dispose: async () => {
			await stream.close();
			await window.__franklinBridge.mcp.stop(mcpId);
		},
	};
};
