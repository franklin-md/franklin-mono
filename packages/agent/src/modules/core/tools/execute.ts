import type { ToolCall } from '@franklin/mini-acp';
import type { JsonObject } from '@franklin/lib';
import type { ToolInvocation } from '../api/tool.js';

import type { BoundTool } from '../registrations/tools.js';
import {
	errorExecutionResult,
	registeredExecutionResult,
	type ToolExecutionResult,
} from './result.js';

export async function executeBoundToolCall(
	tool: BoundTool,
	call: ToolCall,
	args: JsonObject,
	invocation?: ToolInvocation,
): Promise<ToolExecutionResult> {
	try {
		invocation?.signal.throwIfAborted();
		const parsedArgs = tool.parse(args);
		const { output, rendered } = await tool.run(parsedArgs, invocation);
		return registeredExecutionResult(call, rendered, output);
	} catch (error) {
		return errorExecutionResult(call, formatToolError(error));
	}
}

function formatToolError(error: unknown): string {
	return error instanceof Error ? `Error: ${error.message}` : String(error);
}
