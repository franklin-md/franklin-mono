import type { ToolCall, ToolResult } from '@franklin/mini-acp';
import type { JsonValue } from '@franklin/lib';

import type { ToolResultEvent } from '../../../api/handlers.js';
import type { RenderedToolOutput } from '../../../api/tool.js';

export type ToolExecutionResult<TOutput extends JsonValue = JsonValue> = {
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
			call,
			result: renderedOutputFromToolResult(modelOutput),
		},
	};
}

export function registeredExecutionResult<TOutput extends JsonValue>(
	call: ToolCall,
	renderedOutput: RenderedToolOutput,
	output: TOutput,
): ToolExecutionResult<TOutput> {
	return {
		modelOutput: toolResultFromOutput(call.id, renderedOutput),
		event: {
			call,
			result: renderedOutput,
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

function toolResultFromOutput(
	toolCallId: string,
	output: RenderedToolOutput,
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

function renderedOutputFromToolResult(result: ToolResult): RenderedToolOutput {
	const output: RenderedToolOutput = {
		content: result.content,
	};
	if (result.isError !== undefined) {
		output.isError = result.isError;
	}
	return output;
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
