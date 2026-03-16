import type z from 'zod';

export interface ToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
}

export type AnyToolDefinition = ToolDefinition<any>;

export interface SerializedToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}
