import type { BaseRuntime } from '@franklin/extensibility';
import type { MiniACPAgent } from '@franklin/mini-acp';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import { executeRegisteredToolCall } from './registered.js';
import { fallbackExecutionResult } from './result.js';
import type { ToolLayer } from './types.js';

export function buildToolExecuteMiddleware<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		layer.observers.toolCall.notify(params);

		const tool = layer.tools.find((t) => t.name === params.call.name);
		const execution = tool
			? await executeRegisteredToolCall(
					tool,
					params.call,
					params.call.arguments,
					layer.getRuntime,
				)
			: fallbackExecutionResult(await next(params), params.call);

		layer.observers.toolResult.notify(execution.event);

		return execution.modelOutput;
	};
}
