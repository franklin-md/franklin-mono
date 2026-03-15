import type { StdioPipeOptions, Stream } from '@franklin/transport';
import type { AnyToolDefinition } from './tools/types.js';

export interface LocalMcpOptions {
	name: string;
	tools: AnyToolDefinition[];
}

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
