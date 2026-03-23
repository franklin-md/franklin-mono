import type { ImageContent, TextContent, ToolCallContent } from './content.js';

// ---------------------------------------------------------------------------
// Tool definitions and results
// ---------------------------------------------------------------------------

export type ToolDefinition = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
};

// Convenience aliases extracted from content/message types for use in
// the base protocol and session protocol interfaces.

export type ToolCall = ToolCallContent;

export type ToolResult = {
	toolCallId: string;
	content: Array<TextContent | ImageContent>;
	isError?: boolean;
};

export type ToolExecuteParams = {
	call: ToolCall;
};
export type ToolExecuteHandler = (
	params: ToolExecuteParams,
) => Promise<ToolResult>;
