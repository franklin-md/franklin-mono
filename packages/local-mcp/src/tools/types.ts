import type z from 'zod';

export interface ToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	handler: (args: TInput) => Promise<unknown>;
}

export type AnyToolDefinition = ToolDefinition<any>;
