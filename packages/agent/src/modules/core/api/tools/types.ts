import type z from 'zod';

export interface ToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
}

export type AnyToolDefinition = ToolDefinition<any>;
