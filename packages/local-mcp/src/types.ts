import type {
	Duplex,
	StdioPipeOptions,
	BridgeRequest,
	BridgeResponse,
} from '@franklin/transport';

export type McpServerConfig = StdioPipeOptions;

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
