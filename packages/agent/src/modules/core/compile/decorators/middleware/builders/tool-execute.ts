import type { BaseRuntime } from '@franklin/extensibility';
import type { MiniACPAgent, ToolResult } from '@franklin/mini-acp';
import { z } from 'zod';
import type {
	ToolObserverEvent,
	ToolObserverHandler,
	ToolObserverParamsMap,
} from '../../../../api/handlers.js';
import { resolveToolOutput } from '../../../../api/tool.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type { RegisteredTool } from '../../../tools/index.js';

export type ToolObservers = {
	[K in ToolObserverEvent]: ToolObserverHandler<K>[];
};

export function hasAnyToolObserver(observers: ToolObservers): boolean {
	return observers.toolCall.length > 0 || observers.toolResult.length > 0;
}

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

/**
 * Build server-side middleware that short-circuits toolExecute
 * for tools registered by extensions, and notifies tool observers
 * before/after each call.
 */
export function buildToolExecuteMiddleware<Runtime extends BaseRuntime>(
	tools: RegisteredTool<unknown, Runtime>[],
	observers: ToolObservers,
	getRuntime: () => Runtime,
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		notifyObservers(observers, 'toolCall', params);

		const tool = tools.find((t) => t.name === params.call.name);
		const result = tool
			? await toToolResult(
					tool,
					params.call.id,
					params.call.arguments,
					getRuntime,
				)
			: await next(params);

		notifyObservers(observers, 'toolResult', { ...result, call: params.call });

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
