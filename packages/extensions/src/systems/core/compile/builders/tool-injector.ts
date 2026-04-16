import type { MiniACPClient } from '@franklin/mini-acp';
import { serializeTool } from '../../api/tools/index.js';
import type { ExtensionToolDefinition } from '../../api/tool.js';
import type { MethodMiddleware } from '../../api/middleware/types.js';

/**
 * Build a setContext middleware that injects serialized tool definitions
 * into the context's tools array.
 */
export function buildToolInjector(
	tools: ExtensionToolDefinition[],
	existingSetContext?: MethodMiddleware<MiniACPClient['setContext']>,
): MethodMiddleware<MiniACPClient['setContext']> {
	const serialized = tools.map((t) => serializeTool(t));

	const injector: MethodMiddleware<MiniACPClient['setContext']> = (
		params,
		next,
	) => {
		return next({
			...params,
			tools: [...(params.tools ?? []), ...serialized],
		});
	};

	if (existingSetContext) {
		// Waterfall runs first, then tool injection
		return (params, next) =>
			existingSetContext(params, (p) => injector(p, next));
	}

	return injector;
}
