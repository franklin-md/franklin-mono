import type { ToolCall, ToolResult } from '@franklin/mini-acp';

import type { ToolResultEvent } from '../../../api/handlers.js';
import type { ToolOutput } from '../../../api/tool.js';

export type ToolExecutionResult<TOutput = unknown> = {
	readonly modelOutput: ToolResult;
	readonly event: ToolResultEvent<TOutput>;
};

export function fallbackExecutionResult(
	modelOutput: ToolResult,
	call: ToolCall,
): ToolExecutionResult {
	return {
		modelOutput,
		event: {
			...modelOutput,
			call,
		},
	};
}

export function registeredExecutionResult<TOutput>(
	modelOutput: ToolResult,
	call: ToolCall,
	output: TOutput,
): ToolExecutionResult<TOutput> {
	return {
		modelOutput,
		event: {
			...modelOutput,
			call,
			output,
		},
	};
}

export function errorExecutionResult(
	call: ToolCall,
	text: string,
): ToolExecutionResult {
	return fallbackExecutionResult(errorToolResult(call.id, text), call);
}

export function toolResultFromOutput(
	toolCallId: string,
	output: ToolOutput,
): ToolResult {
	const modelOutput: ToolResult = {
		toolCallId,
		content: output.content,
	};
	if (output.isError !== undefined) {
		modelOutput.isError = output.isError;
	}
	return modelOutput;
}

function errorToolResult(toolCallId: string, text: string): ToolResult {
	return {
		toolCallId,
		content: [
			{
				type: 'text',
				text,
			},
		],
		isError: true,
	};
}
