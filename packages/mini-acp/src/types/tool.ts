import type { ToolCallContent } from './content.js';

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
	content: Array<
		| { type: 'text'; text: string }
		| { type: 'image'; data: string; mimeType: string }
	>;
	isError?: boolean;
};

export type ToolExecuteHandler = (params: {
	call: ToolCall;
}) => Promise<ToolResult>;
