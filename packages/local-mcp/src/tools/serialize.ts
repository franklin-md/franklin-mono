import { toJsonSchema } from '../schema.js';
import type { AnyToolDefinition, SerializedToolDefinition } from './types.js';

export function serializeTool(
	tool: AnyToolDefinition,
): SerializedToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: toJsonSchema(tool.schema),
	};
}
