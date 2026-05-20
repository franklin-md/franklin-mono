import type { BaseRuntime } from '@franklin/extensibility';
import type { z } from 'zod';

import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type { ToolExecuteReturn } from '../../api/tool.js';

export interface RegisteredTool<
	TInput = unknown,
	Runtime extends BaseRuntime = BaseRuntime,
> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput, runtime: Runtime): MaybePromise<ToolExecuteReturn>;
}

export type BoundTool<TInput = unknown> = {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput): MaybePromise<ToolExecuteReturn>;
};
