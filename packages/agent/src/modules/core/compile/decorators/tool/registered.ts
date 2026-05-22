import type { BaseRuntime } from '@franklin/extensibility';
import type { ToolCall } from '@franklin/mini-acp';
import type { JsonObject } from '@franklin/lib';
import { z } from 'zod';

import { defaultToolRenderOutput } from '../../../api/tool.js';
import type { AnyRegisteredTool } from './types.js';
import {
	errorExecutionResult,
	registeredExecutionResult,
	type ToolExecutionResult,
} from './result.js';

export async function executeRegisteredToolCall<Runtime extends BaseRuntime>(
	tool: AnyRegisteredTool<Runtime>,
	call: ToolCall,
	args: JsonObject,
	getRuntime: () => Runtime,
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

		const runtime = getRuntime();
		const output = await tool.execute(parsedArgs.data, runtime);
		const rendered = tool.render
			? await tool.render(output, parsedArgs.data, runtime)
			: defaultToolRenderOutput(output);
		return registeredExecutionResult(call, rendered, output);
	} catch (error) {
		return errorExecutionResult(call, formatToolError(error));
	}
}

function formatToolError(error: unknown): string {
	return error instanceof Error ? `Error: ${error.message}` : String(error);
}
