import type { ToolDefinition as SerializedToolDefinition } from '@franklin/mini-acp';
import { z } from 'zod';

import type { AnyToolDefinition } from './types.js';

/**
 * Converts a Zod schema to JSON Schema using Zod's built-in conversion.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
	return z.toJSONSchema(schema) as Record<string, unknown>;
}

export function serializeTool(
	tool: AnyToolDefinition,
): SerializedToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: toJsonSchema(tool.schema),
	};
}
