import type { BaseRuntime } from '@franklin/extensibility';
import type { z } from 'zod';

import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type { ToolOutput } from '../../api/tool.js';

export interface RegisteredTool<
	TInput = unknown,
	TOutput = unknown,
	Runtime extends BaseRuntime = BaseRuntime,
> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute: (params: TInput, runtime: Runtime) => MaybePromise<TOutput>;
	render?: (
		output: TOutput,
		params: TInput,
		runtime: Runtime,
	) => MaybePromise<ToolOutput>;
}

export type AnyRegisteredTool<Runtime extends BaseRuntime = BaseRuntime> =
	RegisteredTool<unknown, unknown, Runtime>;
