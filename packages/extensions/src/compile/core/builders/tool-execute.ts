import type { MiniACPAgent } from '@franklin/mini-acp';
import type {
	ToolObserverEvent,
	ToolObserverHandler,
	ToolObserverParamsMap,
} from '../../../api/core/events.js';
import type { ExtensionToolDefinition } from '../../../api/core/tool.js';
import { resolveToolOutput } from '../../../api/core/tool.js';
import type { MethodMiddleware } from '../../../api/core/middleware/types.js';

function notifyObservers<K extends ToolObserverEvent>(
	observers: ReadonlyMap<
		ToolObserverEvent,
		ToolObserverHandler<ToolObserverEvent>[]
	>,
	event: K,
	params: ToolObserverParamsMap[K],
): void {
	const fns = observers.get(event);
	if (!fns) return;
	for (const fn of fns) fn(params);
}

/**
 * Build server-side middleware that short-circuits toolExecute
 * for tools registered by extensions.
 *
 * When observers are provided, notifies them before and after execution.
 */
export function buildToolExecuteMiddleware(
	tools: ExtensionToolDefinition[],
	observers?: ReadonlyMap<
		ToolObserverEvent,
		ToolObserverHandler<ToolObserverEvent>[]
	>,
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		if (observers && observers.size > 0) {
			notifyObservers(observers, 'toolCall', params);
		}

		const tool = tools.find((t) => t.name === params.call.name);
		const result = tool
			? await toToolResult(tool, params.call.id, params.call.arguments)
			: await next(params);

		if (observers && observers.size > 0) {
			notifyObservers(observers, 'toolResult', {
				...result,
				call: params.call,
			});
		}

		return result;
	};
}

async function toToolResult(
	tool: ExtensionToolDefinition,
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
