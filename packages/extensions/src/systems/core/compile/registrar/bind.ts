import type { z } from 'zod';
import type { MaybePromise } from '../../../../algebra/types/index.js';
import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import type {
	ExtensionToolDefinition,
	ToolExecuteReturn,
} from '../../api/tool.js';
import type { WithContext } from './types.js';

/**
 * Inverse of `WithContext`: close over `getCtx` so the resulting handler
 * accepts the original args without the trailing runtime parameter.
 *
 * Builders consume the bound shape; orchestration code (e.g. middleware
 * assembly) calls this at the boundary so each builder's signature stays
 * runtime-agnostic.
 */
export function bindHandler<H extends (...args: any[]) => any, R>(
	raw: WithContext<H, R>,
	getCtx: () => R,
): H {
	return ((...args: Parameters<H>) => raw(...args, getCtx())) as H;
}

/** Array variant — equivalent to `raws.map((r) => bindHandler(r, getCtx))`. */
export function bindHandlers<H extends (...args: any[]) => any, R>(
	raws: WithContext<H, R>[],
	getCtx: () => R,
): H[] {
	return raws.map((h) => bindHandler(h, getCtx));
}

/**
 * The executable shape consumed by the tool middleware: a tool definition
 * whose `execute` already closes over `getCtx`, mirroring `bindHandler`'s
 * relationship to `WithContext` for handlers.
 */
export type BoundTool<TInput = unknown> = {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput): MaybePromise<ToolExecuteReturn>;
};

export function bindTool<R extends BaseRuntime>(
	tool: ExtensionToolDefinition<unknown, R>,
	getCtx: () => R,
): BoundTool {
	return {
		name: tool.name,
		description: tool.description,
		schema: tool.schema,
		execute: (params) => tool.execute(params, getCtx()),
	};
}
