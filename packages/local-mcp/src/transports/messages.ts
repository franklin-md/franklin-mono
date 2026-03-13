/**
 * Factory and types for MCP relay CallTool response messages.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Using JSONL Codec
export function createSuccess(json: unknown): CallToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(json) }],
	};
}

export function createError(text: string): CallToolResult {
	return {
		content: [{ type: 'text', text }],
		isError: true,
	};
}
