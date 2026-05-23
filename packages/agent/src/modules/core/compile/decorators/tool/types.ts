import type { JsonValue, Observer } from '@franklin/lib';
import type { z } from 'zod';

import type { MaybePromise } from '../../../../../utils/maybe-promise.js';
import type { ToolCallEvent, ToolResultEvent } from '../../../api/handlers.js';
import type { RenderedToolOutput } from '../../../api/tool.js';

export interface RegisteredTool<
	TInput = unknown,
	TOutput extends JsonValue = JsonValue,
> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	run: (params: TInput) => MaybePromise<RegisteredToolResult<TOutput>>;
}

export type RegisteredToolResult<TOutput extends JsonValue = JsonValue> = {
	readonly output: TOutput;
	readonly rendered: RenderedToolOutput;
};

export type AnyRegisteredTool = RegisteredTool;

export type ToolObservers = {
	readonly toolCall: Observer<[ToolCallEvent]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};
