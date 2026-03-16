import type { StdioPipeOptions, Stream } from '@franklin/transport';

export type McpServerConfig = StdioPipeOptions;

type ToolCall = {
	tool: string;
	arguments: unknown;
};

export type ToolCallRequest = {
	id: string;
	body: ToolCall;
};

export type ToolCallStream = Stream<ToolCallRequest, Response>;

export interface LocalMcpTransport {
	server: McpServerConfig;
	stream: ToolCallStream;
	dispose(): Promise<void>;
}
