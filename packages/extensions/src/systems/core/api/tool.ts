import type { ToolResultContent } from '@franklin/mini-acp';
import type { MaybePromise } from '../../../algebra/types/index.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import type { z } from 'zod';

export type ToolOutput = {
	content: ToolResultContent[];
	isError?: boolean;
};

export type ToolExecuteReturn = string | ToolOutput;

export function resolveToolOutput(value: ToolExecuteReturn): ToolOutput {
	if (typeof value === 'string') {
		return { content: [{ type: 'text', text: value }] };
	}
	return value;
}

/**
 * The public shape of a tool registered via `api.registerTool(...)`.
 *
 * `execute` receives the call params plus the fully-tied runtime context —
 * the same ctx any registered handler sees. Middleware invokes
 * `tool.execute(params, getCtx())` at call time (mirroring how handlers
 * are bound), so there is no separate "bound" shape.
 */
export interface ExtensionToolDefinition<
	TInput = unknown,
	Ctx extends BaseRuntime = BaseRuntime,
> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput, ctx: Ctx): MaybePromise<ToolExecuteReturn>;
}
