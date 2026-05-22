import type { ToolDefinition } from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import type { JsonObject } from '@franklin/lib';
import { z } from 'zod';

import type { AnyRegisteredTool } from './types.js';

/**
 * Converts a Zod schema to a JSON Schema suitable for tool inputSchema.
 * Strips the $schema meta-field (it's not required by the agents, and implementations
 * (like pi-ai) get confused when there are additional fields like schemas
 */
export function toToolInputSchema(schema: z.ZodType): JsonObject {
	const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
	delete jsonSchema.$schema;
	return jsonSchema as JsonObject;
}

export function serializeTool<Runtime extends BaseRuntime>(
	tool: AnyRegisteredTool<Runtime>,
): ToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: toToolInputSchema(tool.schema),
	};
}
