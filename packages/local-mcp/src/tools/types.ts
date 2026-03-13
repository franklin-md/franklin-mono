import type z from 'zod';

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	handler: (args: TInput) => Promise<TOutput>;
}

export type AnyToolDefinition = ToolDefinition<any, any>;

export interface SerializedToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}
