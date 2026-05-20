import type { z } from 'zod';
import type { BaseRuntime } from '@franklin/extensibility';
import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type {
	ExtensionToolDefinition,
	ToolExecuteReturn,
} from '../../api/tool.js';

/**
 * The executable shape consumed by the tool middleware: a tool definition
 * whose `execute` already closes over `getCtx`.
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
