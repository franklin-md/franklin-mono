import type z from 'zod';

export interface ToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
}

export type AnyToolDefinition = ToolDefinition<any>;

/**
 * Wire-format tool definition (JSON Schema based).
 * Re-exported from mini-acp for convenience.
 */
export type { ToolDefinition as SerializedToolDefinition } from '@franklin/mini-acp';
