import type { BaseRuntime } from '@franklin/extensibility';

import type { BoundTool, RegisteredTool } from './types.js';

export function bindTool<R extends BaseRuntime>(
	tool: RegisteredTool<unknown, R>,
	getCtx: () => R,
): BoundTool {
	return {
		name: tool.name,
		description: tool.description,
		schema: tool.schema,
		execute: (params) => tool.execute(params, getCtx()),
	};
}
