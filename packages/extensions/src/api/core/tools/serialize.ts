import type { ToolDefinition as SerializedToolDefinition } from '@franklin/mini-acp';
import { z } from 'zod';

import type { AnyToolDefinition } from './types.js';

/**
 * Converts a Zod schema to a JSON Schema suitable for tool inputSchema.
 * Strips the $schema meta-field (it's not required by the agents, and implementations
 * (like pi-ai) get confused when there are additional fields like schemas
 */
export function toToolInputSchema(schema: z.ZodType): Record<string, unknown> {
	const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
	delete jsonSchema.$schema;
	return jsonSchema;
}

export function serializeTool(
	tool: AnyToolDefinition,
): SerializedToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: toToolInputSchema(tool.schema),
	};
}
