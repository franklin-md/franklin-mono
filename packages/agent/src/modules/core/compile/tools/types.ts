import type { BaseRuntime } from '@franklin/extensibility';
import type { JsonValue } from '@franklin/lib';
import type { z } from 'zod';

import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type { RenderedToolOutput } from '../../api/tool.js';

export interface RegisteredTool<
	TInput = unknown,
	TOutput extends JsonValue = JsonValue,
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
	) => MaybePromise<RenderedToolOutput>;
}

export type AnyRegisteredTool<Runtime extends BaseRuntime = BaseRuntime> =
	RegisteredTool<unknown, JsonValue, Runtime>;
