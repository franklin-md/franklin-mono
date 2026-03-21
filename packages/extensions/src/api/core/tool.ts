import type { ToolDefinition } from '@franklin/local-mcp';
import type { MaybePromise } from '../../types/shared.js';

export interface ExtensionToolDefinition<
	TInput = unknown,
	TOutput = unknown,
> extends ToolDefinition<TInput> {
	execute(params: TInput): MaybePromise<TOutput>;
}
