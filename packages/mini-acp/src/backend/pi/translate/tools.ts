import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import type { JsonObject } from '@franklin/lib';
import type {
	ToolDefinition,
	ToolExecuteHandler,
	ToolResult,
} from '../../../types/tool.js';

// ---------------------------------------------------------------------------
// Tool bridging — ToolDefinition + handler → AgentTool
//
// Converts a single mini-acp ToolDefinition into a pi-agent-core AgentTool.
// The handler is called when the tool is executed (typically client.toolExecute).
// ---------------------------------------------------------------------------

export function bridgeTool(
	def: ToolDefinition,
	handler: ToolExecuteHandler,
): AgentTool {
	return {
		name: def.name,
		description: def.description,
		label: def.name,
		// JSON Schema is structurally compatible with TypeBox at runtime
		parameters: def.inputSchema as AgentTool['parameters'],
		execute: async (
			toolCallId: string,
			params: unknown,
		): Promise<AgentToolResult<unknown>> => {
			const result: ToolResult = await handler({
				call: {
					type: 'toolCall',
					id: toolCallId,
					name: def.name,
					arguments: (params ?? {}) as JsonObject,
				},
			});
			return {
				content: result.content,
				details: undefined,
			};
		},
	};
}
