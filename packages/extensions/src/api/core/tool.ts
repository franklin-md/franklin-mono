import type { MaybePromise } from '../../types/shared.js';
import type { ContentBlockResult } from './content-block.js';
import type { z } from 'zod';

export interface ExtensionToolDefinition<TInput = unknown, TOutput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput): MaybePromise<TOutput | ContentBlockResult>;
}
