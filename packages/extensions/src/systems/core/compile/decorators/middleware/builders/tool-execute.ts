import type { MiniACPAgent } from '@franklin/mini-acp';
import type {
	ToolObserverEvent,
	ToolObserverHandler,
	ToolObserverParamsMap,
} from '../../../../api/handlers.js';
import { resolveToolOutput } from '../../../../api/tool.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type { BoundTool } from '../../../registrar/bind.js';

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
export function buildToolExecuteMiddleware(
	tools: BoundTool[],
	observers: ToolObservers,
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		notifyObservers(observers, 'toolCall', params);

		const tool = tools.find((t) => t.name === params.call.name);
		const result = tool
			? await toToolResult(tool, params.call.id, params.call.arguments)
			: await next(params);

		notifyObservers(observers, 'toolResult', { ...result, call: params.call });

		return result;
	};
}

async function toToolResult(
	tool: BoundTool,
	toolCallId: string,
	args: Record<string, unknown>,
) {
	try {
		const raw = await tool.execute(args);
		const output = resolveToolOutput(raw);
		return {
			toolCallId,
			content: output.content,
			isError: output.isError,
		};
	} catch (error) {
		return {
			toolCallId,
			content: [
				{
					type: 'text' as const,
					text:
						error instanceof Error ? `Error: ${error.message}` : String(error),
				},
			],
			isError: true,
		};
	}
}
