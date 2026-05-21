import type { MiniACPAgent } from '@franklin/mini-acp';
import { passThrough } from '@franklin/lib/middleware';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ServerMiddleware } from '../middleware/types.js';
import { hasAnyToolLayer } from './build.js';
import { buildToolExecuteMiddleware } from './execute.js';
import type { ToolLayer } from './types.js';

export function buildToolServerMiddleware<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): ServerMiddleware {
	return {
		toolExecute: hasAnyToolLayer(layer)
			? buildToolExecuteMiddleware(layer)
			: passThrough<MiniACPAgent['toolExecute']>(),
	};
}
