import type { AnyToolDefinition } from './tools/types.js';

export interface LocalMcpOptions {
	name: string;
	tools: AnyToolDefinition[];
}

export interface McpServerConfig {
	name: string;
	command: string;
	args: string[];
	env: Array<{ name: string; value: string }>;
}

export interface LocalMcpTransport {
	start(tools: AnyToolDefinition[]): Promise<McpServerConfig>;
	dispose(): Promise<void>;
}
