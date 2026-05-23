import type { ToolCall } from '@franklin/mini-acp';
import type { JsonObject } from '@franklin/lib';
import { z } from 'zod';

import type { AnyRegisteredTool } from './types.js';
import {
	errorExecutionResult,
	registeredExecutionResult,
	type ToolExecutionResult,
} from './result.js';

export async function executeRegisteredToolCall(
	tool: AnyRegisteredTool,
	call: ToolCall,
	args: JsonObject,
): Promise<ToolExecutionResult> {
	try {
		const parsedArgs = tool.schema.safeParse(args);
		if (!parsedArgs.success) {
			return errorExecutionResult(
				call,
				`Invalid arguments for tool "${tool.name}":\n${z.prettifyError(
					parsedArgs.error,
				)}`,
			);
		}

		const { output, rendered } = await tool.run(parsedArgs.data);
		return registeredExecutionResult(call, rendered, output);
	} catch (error) {
		return errorExecutionResult(call, formatToolError(error));
	}
}

function formatToolError(error: unknown): string {
	return error instanceof Error ? `Error: ${error.message}` : String(error);
}
