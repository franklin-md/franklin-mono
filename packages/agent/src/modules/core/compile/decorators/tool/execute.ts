import type { BaseRuntime } from '@franklin/extensibility';
import type { MiniACPAgent, ToolResult } from '@franklin/mini-acp';
import { z } from 'zod';
import type {
	ToolObserverEvent,
	ToolObserverParamsMap,
} from '../../../api/handlers.js';
import { resolveToolOutput } from '../../../api/tool.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type { RegisteredTool } from '../../tools/index.js';
import type { ToolLayer, ToolObservers } from './types.js';

function notifyObservers<K extends ToolObserverEvent>(
	observers: ToolObservers,
	event: K,
	params: ToolObserverParamsMap[K],
): void {
	const fns = observers[event];
	for (const fn of fns) {
		(fn as (p: ToolObserverParamsMap[K]) => void)(params);
	}
}

export function buildToolExecuteMiddleware<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		notifyObservers(layer.observers, 'toolCall', params);

		const tool = layer.tools.find((t) => t.name === params.call.name);
		const result = tool
			? await toToolResult(
					tool,
					params.call.id,
					params.call.arguments,
					layer.getRuntime,
				)
			: await next(params);

		notifyObservers(layer.observers, 'toolResult', {
			...result,
			call: params.call,
		});

		return result;
	};
}

async function toToolResult<Runtime extends BaseRuntime>(
	tool: RegisteredTool<unknown, Runtime>,
	toolCallId: string,
	args: Record<string, unknown>,
	getRuntime: () => Runtime,
): Promise<ToolResult> {
	try {
		const parsedArgs = tool.schema.safeParse(args);
		if (!parsedArgs.success) {
			return createErrorToolResult(
				toolCallId,
				`Invalid arguments for tool "${tool.name}":\n${z.prettifyError(
					parsedArgs.error,
				)}`,
			);
		}

		const raw = await tool.execute(parsedArgs.data, getRuntime());
		const output = resolveToolOutput(raw);
		return {
			toolCallId,
			content: output.content,
			isError: output.isError,
		};
	} catch (error) {
		return createErrorToolResult(
			toolCallId,
			error instanceof Error ? `Error: ${error.message}` : String(error),
		);
	}
}

function createErrorToolResult(toolCallId: string, text: string): ToolResult {
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
