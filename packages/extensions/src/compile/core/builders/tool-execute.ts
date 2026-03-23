import type { MiniACPAgent } from '@franklin/mini-acp';
import type { ExtensionToolDefinition } from '../../../api/core/tool.js';
import { isContentBlockResult } from '../../../api/core/content-block.js';
import type { MethodMiddleware } from '../../../api/core/middleware/types.js';

/**
 * Build server-side middleware that short-circuits toolExecute
 * for tools registered by extensions.
 */
export function buildToolExecuteMiddleware(
	tools: ExtensionToolDefinition[],
): MethodMiddleware<MiniACPAgent['toolExecute']> {
	return async (params, next) => {
		const tool = tools.find((t) => t.name === params.call.name);
		if (tool) {
			const output = await tool.execute(params.call.arguments);
			// If the tool returned structured content blocks (e.g. from
			// the Pi tool bridge), pass them through directly.
			if (isContentBlockResult(output)) {
				return {
					toolCallId: params.call.id,
					content: output.content,
				};
			}
			return {
				toolCallId: params.call.id,
				content: [{ type: 'text' as const, text: JSON.stringify(output) }],
			};
		}
		return next(params);
	};
}
