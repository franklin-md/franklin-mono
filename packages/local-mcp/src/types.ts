import type { McpServerStdio } from '@agentclientprotocol/sdk';
import type {
	Duplex,
	BridgeRequest,
	BridgeResponse,
} from '@franklin/transport';

/**
 * ACP-compliant MCP server config.
 *
 * Agents validate this with zod on `session/new`; any shape mismatch
 * causes an "Invalid params" JSON-RPC error.
 */
export type McpServerConfig = McpServerStdio;

export type ToolCall = {
	tool: string;
	arguments: unknown;
};

export type ToolCallRequest = BridgeRequest<ToolCall>;
export type ToolCallResponse = BridgeResponse<unknown>;
export type McpToolStream = Duplex<ToolCallRequest, ToolCallResponse>;

export interface McpTransport {
	config: McpServerConfig;
	stream: McpToolStream;
	dispose(): Promise<void>;
}
